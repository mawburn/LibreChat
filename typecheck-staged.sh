#!/bin/bash

# Script to run TypeScript type checking, prettier, and eslint on staged files in ./client/src

# Output file
OUTPUT_FILE="typecheck-results.txt"

# Clear the output file
> "$OUTPUT_FILE"

# Add header to output file
echo "Code Quality Check Results" >> "$OUTPUT_FILE"
echo "==========================" >> "$OUTPUT_FILE"
echo "Date: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Get list of staged TypeScript files in ./client/src
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep "^client/src/.*\.\(ts\|tsx\)$")

if [ -z "$STAGED_FILES" ]; then
    echo "No staged TypeScript files found in ./client/src" | tee -a "$OUTPUT_FILE"
    exit 0
fi

echo "Total files to check: $(echo "$STAGED_FILES" | wc -l)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Initialize error tracking
TOTAL_ERRORS=0
TSC_EXIT_CODE=0
PRETTIER_EXIT_CODE=0
ESLINT_EXIT_CODE=0

# Run TypeScript compiler on staged files
echo "1. TypeScript Type Check" >> "$OUTPUT_FILE"
echo "========================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Run tsc on the entire project and filter results for staged files
cd client
TSC_ERRORS=""
STAGED_FILE_ERRORS=0

# Capture all TypeScript output
TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
TSC_EXIT_CODE=$?

# Filter for errors in staged files only
if [ $TSC_EXIT_CODE -ne 0 ]; then
    while IFS= read -r line; do
        for file in $STAGED_FILES; do
            relative_file="${file#client/}"
            if echo "$line" | grep -q "$relative_file"; then
                TSC_ERRORS="$TSC_ERRORS$line\n"
                STAGED_FILE_ERRORS=1
                break
            fi
        done
    done <<< "$TSC_OUTPUT"
fi

cd ..

if [ $STAGED_FILE_ERRORS -eq 0 ]; then
    echo "No TypeScript errors found in staged files" >> "$OUTPUT_FILE"
else
    echo -e "$TSC_ERRORS" >> "$OUTPUT_FILE"
    echo "TypeScript errors found in staged files (see above)" >> "$OUTPUT_FILE"
    ((TOTAL_ERRORS++))
fi
echo "" >> "$OUTPUT_FILE"

# Run Prettier
echo "2. Prettier Formatting Check" >> "$OUTPUT_FILE"
echo "============================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

PRETTIER_ISSUES=""
for file in $STAGED_FILES; do
    # Check if file needs formatting
    if ! npx prettier --check "$file" > /dev/null 2>&1; then
        PRETTIER_ISSUES="$PRETTIER_ISSUES$file\n"
        # Auto-fix with prettier
        npx prettier --write "$file" > /dev/null 2>&1
    fi
done

if [ -z "$PRETTIER_ISSUES" ]; then
    echo "All files are properly formatted" >> "$OUTPUT_FILE"
else
    echo "The following files were auto-formatted:" >> "$OUTPUT_FILE"
    echo -e "$PRETTIER_ISSUES" >> "$OUTPUT_FILE"
    PRETTIER_EXIT_CODE=1
    ((TOTAL_ERRORS++))
fi
echo "" >> "$OUTPUT_FILE"

# Run ESLint
echo "3. ESLint Analysis" >> "$OUTPUT_FILE"
echo "==================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Run eslint on all files at once for better performance
echo "$STAGED_FILES" | xargs npx eslint --fix > /dev/null 2>&1

# Now check for remaining issues
ESLINT_OUTPUT=$(echo "$STAGED_FILES" | xargs npx eslint 2>&1)
ESLINT_EXIT_CODE=$?

if [ $ESLINT_EXIT_CODE -eq 0 ]; then
    echo "No ESLint issues found (or all were auto-fixed)" >> "$OUTPUT_FILE"
else
    echo "ESLint issues that could not be auto-fixed:" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "$ESLINT_OUTPUT" >> "$OUTPUT_FILE"
    ((TOTAL_ERRORS++))
fi

# Summary
echo "" >> "$OUTPUT_FILE"
echo "=============================" >> "$OUTPUT_FILE"
echo "SUMMARY" >> "$OUTPUT_FILE"
echo "=============================" >> "$OUTPUT_FILE"
echo "Files checked: $(echo "$STAGED_FILES" | wc -l)" >> "$OUTPUT_FILE"
echo "TypeScript errors: $([ $STAGED_FILE_ERRORS -eq 0 ] && echo "None in staged files" || echo "Found in staged files")" >> "$OUTPUT_FILE"
echo "Prettier issues: $([ $PRETTIER_EXIT_CODE -eq 0 ] && echo "None" || echo "Auto-fixed")" >> "$OUTPUT_FILE"
echo "ESLint issues: $([ $ESLINT_EXIT_CODE -eq 0 ] && echo "None" || echo "Some remain unfixed")" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if [ $TOTAL_ERRORS -eq 0 ]; then
    echo "✅ All checks passed!" >> "$OUTPUT_FILE"
else
    echo "❌ Issues found in $TOTAL_ERRORS check(s)" >> "$OUTPUT_FILE"
fi

# Also print summary to console
echo ""
echo "Code quality checks complete!"
echo "Results written to: $OUTPUT_FILE"
echo "Files checked: $(echo "$STAGED_FILES" | wc -l)"
echo ""
if [ $STAGED_FILE_ERRORS -ne 0 ]; then
    echo "⚠️  TypeScript errors found in staged files"
fi
if [ $PRETTIER_EXIT_CODE -ne 0 ]; then
    echo "🎨 Prettier auto-formatted some files"
fi
if [ $ESLINT_EXIT_CODE -ne 0 ]; then
    echo "⚠️  ESLint issues remain that need manual fixing"
fi
if [ $TOTAL_ERRORS -eq 0 ]; then
    echo "✅ All checks passed!"
else
    echo ""
    echo "Please review $OUTPUT_FILE for details"
fi