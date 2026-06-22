import ast
import operator
import math
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from decimal import Decimal, InvalidOperation, DivisionByZero, ROUND_HALF_UP
import database

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)
CORS(app)  # Enable Cross-Origin Resource Sharing

# Map AST operators to functions
OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos
}

# Whitelisted safe mathematical functions and constants
SAFE_FUNCTIONS = {
    'sin': math.sin,
    'cos': math.cos,
    'tan': math.tan,
    'log': math.log10,
    'ln': math.log,
    'sqrt': math.sqrt,
    'factorial': math.factorial
}

SAFE_CONSTANTS = {
    'pi': Decimal(str(math.pi)),
    'e': Decimal(str(math.e))
}

# User Settings configuration state (Stored server-side)
USER_CONFIG = {
    "trig_mode": "degrees",  # 'degrees' or 'radians'
    "precision": "auto"      # 'auto', '2', '4'
}

# Stateful memory storage (Global for single-user desktop environment)
MEMORY_VALUE = Decimal('0')

def safe_eval(expression: str) -> Decimal:
    """
    Safely parses and evaluates mathematical expressions using Python's AST module.
    Only basic mathematical expressions, whitelisted operations, and functions are permitted.
    """
    # Normalize typical visual operands
    expression = expression.replace('×', '*').replace('÷', '/').replace('^', '**')
    expression = expression.strip()
    
    if not expression:
        raise ValueError("Expression is empty")
        
    try:
        node = ast.parse(expression, mode='eval')
    except SyntaxError as e:
        raise ValueError("Invalid mathematical syntax") from e

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        elif isinstance(node, ast.Constant):
            val = node.value
            if isinstance(val, (int, float)):
                return Decimal(str(val))
            raise ValueError(f"Unsupported constant type: {type(val).__name__}")
        elif isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            op_type = type(node.op)
            
            if op_type not in OPERATORS:
                raise ValueError(f"Unsupported operator: {op_type.__name__}")
                
            if op_type == ast.Div and right == 0:
                raise ZeroDivisionError("Cannot divide by zero")
                
            try:
                return OPERATORS[op_type](left, right)
            except (InvalidOperation, DivisionByZero) as e:
                raise ValueError("Calculation error") from e
        elif isinstance(node, ast.UnaryOp):
            operand = _eval(node.operand)
            op_type = type(node.op)
            if op_type not in OPERATORS:
                raise ValueError(f"Unsupported operator: {op_type.__name__}")
            return OPERATORS[op_type](operand)
        elif isinstance(node, ast.Name):
            name = node.id
            if name in SAFE_CONSTANTS:
                return SAFE_CONSTANTS[name]
            raise ValueError(f"Undefined variable/constant: {name}")
        elif isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise ValueError("Unsupported dynamic function call")
            
            func_name = node.func.id
            if func_name not in SAFE_FUNCTIONS:
                raise ValueError(f"Unsupported math function: {func_name}")
                
            if len(node.args) != 1:
                raise ValueError(f"Function {func_name} expects exactly 1 argument")
                
            arg_val = _eval(node.args[0])
            
            if func_name in ('sin', 'cos', 'tan'):
                arg_float = float(arg_val)
                if USER_CONFIG['trig_mode'] == 'degrees':
                    arg_float = math.radians(arg_float)
                
                try:
                    res_val = SAFE_FUNCTIONS[func_name](arg_float)
                    # Clean up tiny floating point residuals (e.g. sin(180) or cos(90))
                    if abs(res_val) < 1e-12:
                        res_val = 0.0
                    return Decimal(str(res_val))
                except Exception as e:
                    raise ValueError(f"Trigonometric calculation error: {str(e)}") from e
                    
            elif func_name == 'factorial':
                try:
                    arg_int = int(arg_val)
                    if arg_val != arg_int or arg_int < 0:
                        raise ValueError("Factorial requires a non-negative integer")
                    if arg_int > 1000:
                        raise ValueError("Factorial calculation limit exceeded (max 1000)")
                    return Decimal(SAFE_FUNCTIONS[func_name](arg_int))
                except OverflowError:
                    raise ValueError("Calculation overflow in factorial")
                except Exception as e:
                    raise ValueError(f"Factorial calculation error: {str(e)}") from e
                    
            else:
                # log, ln, sqrt
                arg_float = float(arg_val)
                if func_name in ('log', 'ln') and arg_float <= 0:
                    raise ValueError(f"{func_name} argument must be positive")
                if func_name == 'sqrt' and arg_float < 0:
                    raise ValueError("Cannot calculate square root of a negative number")
                    
                try:
                    res_val = SAFE_FUNCTIONS[func_name](arg_float)
                    return Decimal(str(res_val))
                except Exception as e:
                    raise ValueError(f"Calculation error: {str(e)}") from e
        else:
            raise ValueError(f"Unsupported syntax: {type(node).__name__}")

    return _eval(node)

PROGRAMMER_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.BitAnd: operator.and_,
    ast.BitOr: operator.or_,
    ast.BitXor: operator.xor,
    ast.Invert: operator.invert,
    ast.LShift: operator.lshift,
    ast.RShift: operator.rshift,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos
}

def wrap_to_word_size(val: int, word_size: str) -> int:
    if word_size == 'DWORD':
        bits = 32
    elif word_size == 'WORD':
        bits = 16
    elif word_size == 'BYTE':
        bits = 8
    else:  # QWORD
        bits = 64
        
    # Mask to positive range [0, 2^bits - 1]
    val = val & ((1 << bits) - 1)
    # Convert to signed two's complement
    if val & (1 << (bits - 1)):
        val -= (1 << bits)
    return val

def safe_eval_programmer(expression: str, word_size: str) -> int:
    expression = expression.replace('×', '*').replace('÷', '//')
    expression = expression.strip()
    
    if not expression:
        raise ValueError("Expression is empty")
        
    try:
        node = ast.parse(expression, mode='eval')
    except SyntaxError as e:
        raise ValueError("Invalid mathematical syntax") from e

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        elif isinstance(node, ast.Constant):
            val = node.value
            if isinstance(val, int):
                return val
            raise ValueError(f"Unsupported constant type: {type(val).__name__}")
        elif isinstance(node, ast.BinOp):
            left = _eval(node.left)
            right = _eval(node.right)
            op_type = type(node.op)
            
            if op_type == ast.Div:
                op_type = ast.FloorDiv
                
            if op_type not in PROGRAMMER_OPERATORS:
                raise ValueError(f"Unsupported operator: {op_type.__name__}")
                
            if op_type in (ast.FloorDiv, ast.Mod) and right == 0:
                raise ZeroDivisionError("Cannot divide by zero")
                
            try:
                res = PROGRAMMER_OPERATORS[op_type](left, right)
                return wrap_to_word_size(res, word_size)
            except Exception as e:
                raise ValueError("Calculation error") from e
        elif isinstance(node, ast.UnaryOp):
            operand = _eval(node.operand)
            op_type = type(node.op)
            if op_type not in PROGRAMMER_OPERATORS:
                raise ValueError(f"Unsupported operator: {op_type.__name__}")
            try:
                res = PROGRAMMER_OPERATORS[op_type](operand)
                return wrap_to_word_size(res, word_size)
            except Exception as e:
                raise ValueError("Calculation error") from e
        else:
            raise ValueError(f"Unsupported syntax: {type(node).__name__}")

    res_val = _eval(node)
    return wrap_to_word_size(res_val, word_size)

def format_result(d: Decimal) -> str:
    """
    Formats the decimal calculation result beautifully.
    """
    # Remove trailing zeroes for clean display
    if d == d.to_integral_value():
        return str(d.quantize(Decimal(1)))
    
    s = str(d.normalize())
    if 'e' in s or 'E' in s:
        # Use concise general float standard if normalized to standard exponent form
        return f"{float(d):g}"
    return s

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/settings', methods=['GET', 'POST'])
def settings_api():
    global USER_CONFIG
    if request.method == 'GET':
        return jsonify({
            "status": "success",
            "settings": USER_CONFIG
        })
    elif request.method == 'POST':
        data = request.get_json() or {}
        trig = data.get('trig_mode')
        prec = data.get('precision')
        
        if trig in ('degrees', 'radians'):
            USER_CONFIG['trig_mode'] = trig
        if prec in ('auto', '2', '4'):
            USER_CONFIG['precision'] = prec
            
        return jsonify({
            "status": "success",
            "settings": USER_CONFIG
        })

@app.route('/api/calculate', methods=['POST'])
def calculate():
    data = request.get_json() or {}
    expression = data.get('expression', '')
    
    try:
        result_dec = safe_eval(expression)
        
        # Apply decimal rounding if configured in settings
        try:
            prec = USER_CONFIG["precision"]
            if prec == '2':
                result_dec = result_dec.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            elif prec == '4':
                result_dec = result_dec.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
        except InvalidOperation:
            pass  # Fallback to unrounded if overflow occurs in quantization
            
        result_str = format_result(result_dec)
        
        # Save to SQLite history database
        database.add_history(expression, result_str)
        
        return jsonify({
            "status": "success",
            "expression": expression,
            "result": result_str
        })
    except ZeroDivisionError:
        return jsonify({
            "status": "error",
            "error": "Cannot divide by zero"
        }), 400
    except ValueError as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": f"An unexpected calculation error occurred: {str(e)}"
        }), 500

@app.route('/api/history', methods=['GET', 'DELETE'])
def history_api():
    if request.method == 'GET':
        try:
            records = database.get_history()
            return jsonify({
                "status": "success",
                "history": records
            })
        except Exception as e:
            return jsonify({
                "status": "error",
                "error": str(e)
            }), 500
            
    elif request.method == 'DELETE':
        try:
            database.clear_history()
            return jsonify({
                "status": "success",
                "message": "Calculation history cleared"
            })
        except Exception as e:
            return jsonify({
                "status": "error",
                "error": str(e)
            }), 500

@app.route('/api/memory', methods=['GET', 'POST'])
def memory_api():
    global MEMORY_VALUE
    
    if request.method == 'GET':
        return jsonify({
            "status": "success",
            "memory": format_result(MEMORY_VALUE)
        })
        
    elif request.method == 'POST':
        data = request.get_json() or {}
        action = data.get('action', '')
        value_str = data.get('value', '0')
        
        try:
            # Parse value
            val = Decimal(str(value_str)) if value_str else Decimal('0')
        except (InvalidOperation, ValueError):
            return jsonify({
                "status": "error",
                "error": "Invalid memory value"
            }), 400
            
        if action == 'MC':    # Memory Clear
            MEMORY_VALUE = Decimal('0')
        elif action == 'MR':  # Memory Recall (no changes)
            pass
        elif action == 'MS':  # Memory Store
            MEMORY_VALUE = val
        elif action == 'M+':  # Memory Add
            MEMORY_VALUE += val
        elif action == 'M-':  # Memory Subtract
            MEMORY_VALUE -= val
        else:
            return jsonify({
                "status": "error",
                "error": "Unsupported memory action"
            }), 400
            
        return jsonify({
            "status": "success",
            "memory": format_result(MEMORY_VALUE)
        })

@app.route('/api/calculate/programmer', methods=['POST'])
def calculate_programmer():
    data = request.get_json() or {}
    expression = data.get('expression', '')
    word_size = data.get('word_size', 'QWORD')
    
    try:
        result_int = safe_eval_programmer(expression, word_size)
        
        # Save to SQLite history database
        database.add_history(expression, str(result_int))
        
        return jsonify({
            "status": "success",
            "expression": expression,
            "result": str(result_int)
        })
    except ZeroDivisionError:
        return jsonify({
            "status": "error",
            "error": "Cannot divide by zero"
        }), 400
    except ValueError as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": f"An unexpected calculation error occurred: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Initialize DB (database module does this on import, but we make sure)
    database.init_db()
    print("Starting Flask web server on http://127.0.0.1:5000...")
    app.run(host='127.0.0.1', port=5000, debug=True)
