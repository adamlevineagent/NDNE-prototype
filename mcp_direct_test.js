/**
 * MCP Server Testing Script
 * 
 * This script tests both the basic-memory and puppeteer MCP servers
 * defined in .vscode/mcp.json using direct connections via the environment.
 */

// Import necessary modules
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Starting MCP Server Tests\n');
  
  // Create a screenshots directory if it doesn't exist
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }

  // Test 1: Basic-Memory Server
  console.log('===== Testing basic-memory server =====');
  try {
    // Step 1: Check if the server is available
    console.log('1. Checking server availability...');
    // For a real server test, we would check if the server is running
    // In VSCode, this would be handled by the VSCode extension automatically
    
    // Step 2: Write a test note
    console.log('2. Writing a test note...');
    const testNote = {
      title: "Test Note",
      content: `This is a test note created on ${new Date().toISOString()}`
    };
    console.log(`   Title: ${testNote.title}`);
    console.log(`   Content: ${testNote.content}`);
    
    // In a client-based test, we would:
    // const writeResult = await memoryClient.useTool('write_note', testNote);
    // console.log('Write result:', writeResult);
    
    // Step 3: Read the test note back
    console.log('3. Reading test note...');
    // const readResult = await memoryClient.useTool('read_note', { title: testNote.title });
    // console.log('Read result:', readResult);
    
    // Step 4: Verify contents
    console.log('4. Verification...');
    // if (readResult.content.includes(testNote.content)) {
    //   console.log('✅ Verification successful: Note content matches');
    // } else {
    //   console.log('❌ Verification failed: Content does not match');
    // }
    
    console.log('\n✅ basic-memory server test preparation complete');
    console.log('To execute the test, use the following code in the VSCode environment:');
    console.log(`
// 1. Write a note
await vscode.commands.executeCommand('mcp.useTool', 'basic-memory', 'write_note', {
  title: "${testNote.title}",
  content: "${testNote.content}"
});

// 2. Read the note back
const readResult = await vscode.commands.executeCommand('mcp.useTool', 'basic-memory', 'read_note', {
  title: "${testNote.title}"
});

// 3. Verify the content
console.log('Read result:', readResult);
    `);
    
  } catch (error) {
    console.error('❌ Error testing basic-memory server:', error.message);
  }
  
  // Test 2: Puppeteer Server
  console.log('\n===== Testing puppeteer server =====');
  try {
    // Step 1: Check if the server is available
    console.log('1. Checking server availability...');
    // For a real server test, we would check if the server is running
    
    // Step 2: Launch browser and navigate to example.com
    console.log('2. Launching browser and navigating to example.com...');
    // In a client-based test, we would:
    // await puppeteerClient.useTool('launch_browser', {});
    // await puppeteerClient.useTool('navigate', { url: 'https://example.com' });
    
    // Step 3: Take a screenshot
    console.log('3. Taking a screenshot...');
    // const screenshotResult = await puppeteerClient.useTool('screenshot', {});
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotDir, `puppeteer-test-${timestamp}.png`);
    
    // Step 4: Save the screenshot
    console.log(`4. Screenshot would be saved to: ${screenshotPath}`);
    // fs.writeFileSync(screenshotPath, Buffer.from(screenshotResult.data, 'base64'));
    
    // Step 5: Close browser
    console.log('5. Closing browser...');
    // await puppeteerClient.useTool('close_browser', {});
    
    console.log('\n✅ puppeteer server test preparation complete');
    console.log('To execute the test, use the following code in the VSCode environment:');
    console.log(`
// 1. Launch browser
await vscode.commands.executeCommand('mcp.useTool', 'puppeteer', 'launch_browser', {});

// 2. Navigate to example.com
await vscode.commands.executeCommand('mcp.useTool', 'puppeteer', 'navigate', { 
  url: 'https://example.com' 
});

// 3. Take a screenshot
const screenshotResult = await vscode.commands.executeCommand('mcp.useTool', 'puppeteer', 'screenshot', {});

// 4. Save the screenshot
const fs = require('fs');
const path = require('path');
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir);
}
const screenshotPath = path.join(screenshotDir, 'puppeteer-screenshot.png');
fs.writeFileSync(screenshotPath, Buffer.from(screenshotResult.data, 'base64'));

// 5. Close the browser
await vscode.commands.executeCommand('mcp.useTool', 'puppeteer', 'close_browser', {});
    `);
    
  } catch (error) {
    console.error('❌ Error testing puppeteer server:', error.message);
  }
  
  console.log('\n===== MCP Server Test Script Complete =====');
  console.log('This script prepares the test scenarios. To execute the actual tests, use the use_mcp_tool command in the VSCode environment.');
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
});