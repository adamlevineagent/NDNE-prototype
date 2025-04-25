#!/bin/bash

# Script to concatenate all project files into one giant text file
# Preserves file paths and adds line numbers to content

OUTPUT_FILE="all_project_files.txt"
echo "Concatenating all project files into $OUTPUT_FILE"

# Clear or create the output file
> "$OUTPUT_FILE"

# Find all files in the project directory, excluding node_modules and git directories
find . -type f \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" \
  ! -path "*/build/*" \
  ! -path "*/dist/*" \
  ! -path "$OUTPUT_FILE" \
  | sort | while read -r file; do
  
  echo "Processing: $file"
  
  # Add a header with the file path
  echo "" >> "$OUTPUT_FILE"
  echo "==============================================" >> "$OUTPUT_FILE"
  echo "FILE: $file" >> "$OUTPUT_FILE"
  echo "==============================================" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"

  # If it's a text file, add it with line numbers
  if file "$file" | grep -q text; then
    # Add line numbers to the file content
    nl -ba "$file" | sed 's/^/     /' >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  else
    # For binary files, just note that it's binary
    echo "     [Binary file, content omitted]" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  fi
done

# Add summary
echo "Done! All files have been concatenated to $OUTPUT_FILE"
filesize=$(du -h "$OUTPUT_FILE" | cut -f1)
echo "Total size: $filesize"