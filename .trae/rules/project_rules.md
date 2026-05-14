# BlockOS Project Rules

## Workflow: Post-Task Review

After completing any coding task (feature, bugfix, refactor), always perform a full review before reporting completion:

1. **Build Check**: Run `npm run build` to verify no compilation or type errors
2. **Runtime Check**: Start dev server and verify no Edge Runtime / module errors in console
3. **Code Consistency**: Verify new code follows existing patterns (imports, naming, styling)
4. **No Regressions**: Ensure changes don't break existing functionality
5. **Type Safety**: Confirm no new `any` types or type mismatches introduced
6. **Edge Cases**: Check for missing null checks, empty states, error boundaries
7. **Cleanup**: Remove unused imports, variables, and dead code

If any issue is found during review, fix it immediately before reporting to the user.

## Code Style

- No comments unless explicitly requested
- Follow existing component patterns in the codebase
- Use Zustand store for state, not local useState for shared data
- All new Block types must include x, y, width fields
