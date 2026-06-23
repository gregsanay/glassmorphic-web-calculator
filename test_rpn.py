from decimal import Decimal

from app import safe_eval, safe_eval_programmer, wrap_to_word_size


def test_standard_calculator_math():
    assert safe_eval("2 + 2") == Decimal("4")
    assert safe_eval("3 * (4 + 5)") == Decimal("27")
    assert safe_eval("10 / 4") == Decimal("2.5")
    assert safe_eval("sqrt(16)") == Decimal("4")


def test_constants_and_functions():
    assert safe_eval("pi") == Decimal(str(__import__("math").pi))
    assert safe_eval("e") == Decimal(str(__import__("math").e))
    assert safe_eval("factorial(5)") == Decimal("120")


def test_programmer_calculator_math():
    assert safe_eval_programmer("5 & 3", "QWORD") == 1
    assert safe_eval_programmer("10 // 3", "QWORD") == 3
    assert safe_eval_programmer("1 << 4", "QWORD") == 16


def test_word_size_wrapping():
    assert wrap_to_word_size(255, "BYTE") == -1
    assert wrap_to_word_size(32768, "WORD") == -32768


def test_error_paths():
    try:
        safe_eval("1 / 0")
    except ZeroDivisionError:
        pass
    else:
        raise AssertionError("Expected ZeroDivisionError for division by zero")

    try:
        safe_eval_programmer("1 / 0", "QWORD")
    except ZeroDivisionError:
        pass
    else:
        raise AssertionError("Expected ZeroDivisionError for programmer division by zero")


if __name__ == "__main__":
    test_standard_calculator_math()
    test_constants_and_functions()
    test_programmer_calculator_math()
    test_word_size_wrapping()
    test_error_paths()
    print("Calculator logic tests passed.")
