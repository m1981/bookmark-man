
# Testing Principles Guide

## Core Testing Principles

1. **Test Isolation**
    - Each test must be independent and able to run in any order
    - Reset global state before each test
    - Use targeted test doubles that only implement what's needed
    - Explicitly inject all dependencies to avoid implicit dependencies
    - Clean up after each test

2. **Test Readability**
    - Write clear, descriptive test names (e.g., "should_calculate_total_price_with_discount")
    - Structure tests in Given-When-Then format
    - Use meaningful variable names
    - Make test intention obvious

3. **Behavior-Focused Testing**
    - Test public interfaces, not implementation details
    - Focus on what, not how
    - Write tests from user's perspective
    - Verify outcomes rather than implementation steps
    - Don't test private methods directly

4. **Maintainability**
    - Don't duplicate test code (use setup methods)
    - Keep test code simple and focused
    - Update tests when requirements change
    - Remove obsolete tests
    - Use dependency factories to consistently generate test dependencies

5. **Comprehensive Coverage**
    - Test happy paths, error paths, and edge cases
    - Verify state transitions at each important step
    - Create specific test scenarios for different paths in complex functions
    - Test one logical assertion per test
    - Break down complex functions into smaller test scenarios

## Strategies for Common Testing Challenges

1. **Addressing Complex Dependencies**
    - Create focused mocks that only implement what's needed
    - Add dependency factories to consistently generate test dependencies
    - Clearly inject all dependencies to avoid implicit dependencies

2. **Handling Side Effects**
    - Verify each side effect separately
    - Check state transitions in sequence
    - Use mocks for API calls and storage operations

3. **Managing Global State**
    - Reset global state before each test
    - Explicitly verify global state changes
    - Ensure tests don't affect each other through global state

4. **Tackling Callback Nesting**
    - Break down complex functions into smaller test scenarios
    - Verify each step in the process
    - Use mocks to isolate specific parts of the callback chain

5. **Dealing with Large Function Size**
    - Create specific test scenarios for different paths
    - Verify state at each important step
    - Focus each test on a specific behavior
