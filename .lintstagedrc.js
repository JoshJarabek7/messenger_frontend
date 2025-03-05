const path = require('path');

// Filter out files that should be ignored
const filterIgnoredFiles = filenames => {
  return filenames.filter(file => {
    const relativePath = path.relative(process.cwd(), file);
    // Skip files in node_modules, components/ui, or .next
    return (
      !relativePath.includes('node_modules/') &&
      !relativePath.includes('components/ui/') &&
      !relativePath.includes('.next/')
    );
  });
};

const buildEslintCommand = filenames => {
  const filteredFiles = filterIgnoredFiles(filenames);
  if (filteredFiles.length === 0) return 'echo "No files to lint"';

  return `next lint --fix --file ${filteredFiles
    .map(f => path.relative(process.cwd(), f))
    .join(' --file ')}`;
};

module.exports = {
  '*.{js,jsx,ts,tsx}': [buildEslintCommand],
};
