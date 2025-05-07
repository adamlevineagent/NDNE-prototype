/**
 * MCP Server Environment Test
 * 
 * This script tests the MCP servers (basic-memory and puppeteer)
 * using the environment's use_mcp_tool capability.
 */

// Test function to execute through use_mcp_tool
async function testBasicMemoryServer() {
  console.log('Testing basic-memory server...');
  
  const testNote = {
    title: "Test Note",
    content: `This is a test note created on ${new Date().toISOString()}`
  };
  
  console.log(`Writing note: "${testNote.title}" with content: "${testNote.content}"`);
  
  // Return the test note for later use
  return testNote;
}

// Make it available globally
global.testBasicMemoryServer = testBasicMemoryServer;

// Export test functions
module.exports = {
  testBasicMemoryServer
};

// Print instructions when run directly
if (require.main === module) {
  console.log('\n==== MCP Server Test Instructions ====\n');
  console.log('To test the basic-memory server, run the following:');
  console.log('1. First, create a note:');
  console.log(`
<use_mcp_tool>
<server_name>basic-memory</server_name>
<tool_name>write_note</tool_name>
<arguments>
{
  "title": "Test Note",
  "content": "This is a test note created on ${new Date().toISOString()}"
}
</arguments>
</use_mcp_tool>
`);

  console.log('2. Then, retrieve the note:');
  console.log(`
<use_mcp_tool>
<server_name>basic-memory</server_name>
<tool_name>read_note</tool_name>
<arguments>
{
  "title": "Test Note"
}
</arguments>
</use_mcp_tool>
`);

  console.log('\nTo test the puppeteer server, run the following:');
  console.log('1. First, launch the browser:');
  console.log(`
<use_mcp_tool>
<server_name>puppeteer</server_name>
<tool_name>launch_browser</tool_name>
<arguments>
{}
</arguments>
</use_mcp_tool>
`);

  console.log('2. Navigate to a website:');
  console.log(`
<use_mcp_tool>
<server_name>puppeteer</server_name>
<tool_name>navigate</tool_name>
<arguments>
{
  "url": "https://example.com"
}
</arguments>
</use_mcp_tool>
`);

  console.log('3. Take a screenshot:');
  console.log(`
<use_mcp_tool>
<server_name>puppeteer</server_name>
<tool_name>screenshot</tool_name>
<arguments>
{}
</arguments>
</use_mcp_tool>
`);

  console.log('4. Finally, close the browser:');
  console.log(`
<use_mcp_tool>
<server_name>puppeteer</server_name>
<tool_name>close_browser</tool_name>
<arguments>
{}
</arguments>
</use_mcp_tool>
`);

  console.log('\n==== Instructions for saving screenshots ====');
  console.log('After taking a screenshot with the puppeteer server, you\'ll receive a base64-encoded image.');
  console.log('To save it, you can use a command like this:');
  console.log(`
<execute_command>
<command>node -e "const fs = require('fs'); const path = require('path'); const dir = path.join(__dirname, 'screenshots'); if (!fs.existsSync(dir)) fs.mkdirSync(dir); fs.writeFileSync(path.join(dir, 'screenshot.png'), Buffer.from('BASE64_DATA_HERE', 'base64'));"</command>
</execute_command>
  `);
  console.log('\nReplace BASE64_DATA_HERE with the actual base64 data returned from the screenshot tool.');
}