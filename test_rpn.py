from decimal import Decimal

def eval_rpn(tokens: list[str]) -> Decimal:
    stack = []
    
    for token in tokens:
        if token in ("+", "-", "*", "/"):
            right = stack.pop()
            left = stack.pop()
            if token == "+":
                stack.append(left + right)
            elif token == "-":
                stack.append(left - right)
            elif token == "*":
                stack.append(left * right)
            elif token == "/":
                stack.append(left / right)
        else:
            stack.append(Decimal(token))
        
    return stack[0]

# --- QUICK VERIFICATION TEST CASES ---
# "3 4 + 5 *" => (3 + 4) * 5 = 35
assert eval_rpn(["3", "4", "+", "5", "*"]) == Decimal("35")

# "10 2 /" => 10 / 2 = 5
assert eval_rpn(["10", "2", "/"]) == Decimal("5")

print("All tests passed! You are a mathematical legend!")
