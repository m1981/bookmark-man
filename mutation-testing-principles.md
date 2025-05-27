## 1. Mutation Testing Best Practices

- One assertion per test - Makes it clear which assertion killed which mutant
- Test in isolation - Each test should be independent
- Use strong assertions - Be specific about expected values
- Target edge cases - Test boundary conditions explicitly

## 2. Write Tests That Distinguish Behavior

Create tests where the original code and mutated code would produce different results:

```javascript
test('should handle whitespace-only strings', () => {
  const result = service.parseStructureText('   \t\n  ');
  expect(result).toEqual([]);
});
```

## 3. Target Edge Cases

Focus on boundary conditions and edge cases:
- Empty strings
- Strings with only whitespace
- Null/undefined values
- Minimum/maximum values
- Special characters

## 4. Be Specific in Assertions

Don't just check that "something happens" - verify exact outputs:
- Use `.toEqual([])` instead of `.toBeTruthy()`
- Check specific properties and values

## 5. Test Both Sides of Conditions

For conditions like `if (x)`, test both when x is true and when x is false.

## 6. Use Multiple Test Cases

Don't rely on a single test - use multiple test cases with different inputs.

## 7. Understand Common Mutation Types

Stryker applies several mutation types:
- Boundary mutations: `>` becomes `>=`, etc.
- Math mutations: `+` becomes `-`, etc.
- Conditional mutations: `&&` becomes `||`, etc.
- Return value mutations: `return x` becomes `return null`, etc.
- Function call removal: `trim()` becomes `""`, etc.

## 8. Check Test Coverage

High code coverage doesn't guarantee mutation coverage. Focus on meaningful assertions.