// Import MCP SDK properly
const { Client, StdioClientTransport } = require('@modelcontextprotocol/sdk');
const fs = require('fs');
const path = require('path');

async function testMCPServers() {
  console.log('Testing MCP connections...');
  
  // Test basic-memory server
  try {
    console.log('\nTesting basic-memory server...');
    const memoryProcess = require('child_process').spawn('bash', ['-c', 'cd mcp_servers/basic-memory && source venv/bin/activate && python -m src.basic_memory.mcp.main'], {
      stdio: ['pipe', 'pipe', process.stderr]
    });
    
    const memoryTransport = new StdioClientTransport(memoryProcess);
    const memoryClient = new Client(memoryTransport);
    
    await memoryClient.connect();
    console.log('Connected to basic-memory server successfully!');
    
    const memoryTools = await memoryClient.listTools();
    console.log(`Available basic-memory tools: ${memoryTools.tools.map(t => t.name).join(', ')}`);
    
    const memoryResources = await memoryClient.listResources();
    console.log(`Available basic-memory resources: ${memoryResources.resources.map(r => r.uri).join(', ')}`);
    
    // Test writing a note
    console.log('\nTesting write_note tool...');
    const testNote = {
      title: "Test Note",
      content: "This is a test note created on " + new Date().toISOString()
    };
    
    const writeResult = await memoryClient.useTool('write_note', {
      title: testNote.title,
      content: testNote.content
    });
    console.log('Write note result:', writeResult);
    
    // Test reading the note back
    console.log('\nTesting read_note tool...');
    const readResult = await memoryClient.useTool('read_note', {
      title: testNote.title
    });
    console.log('Read note result:', readResult);
    
    // Verify the content matches what we wrote
    if (readResult.content.includes(testNote.content)) {
      console.log('\n✓ Successfully verified note content!');
    } else {
      console.log('\n✗ Note content verification failed!');
    }
    
    await memoryClient.close();
    console.log('basic-memory server connection closed');
  } catch (error) {
    console.error('Error testing basic-memory server:', error.message);
  }
  
  // Test puppeteer server
  try {
    console.log('\nTesting puppeteer server...');
    const puppeteerProcess = require('child_process').spawn('npx', ['-y', '@modelcontextprotocol/server-puppeteer'], {
      stdio: ['pipe', 'pipe', process.stderr]
    });
    
    const puppeteerTransport = new StdioClientTransport(puppeteerProcess);
    const puppeteerClient = new Client(puppeteerTransport);
    
    await puppeteerClient.connect();
    console.log('Connected to puppeteer server successfully!');
    
    const puppeteerTools = await puppeteerClient.listTools();
    console.log(`Available puppeteer tools: ${puppeteerTools.tools.map(t => t.name).join(', ')}`);
    
    const puppeteerResources = await puppeteerClient.listResources();
    console.log(`Available puppeteer resources: ${puppeteerResources.resources.map(r => r.uri).join(', ')}`);
    
    // Test website navigation and screenshot
    console.log('\nTesting navigate and screenshot tools...');
    
    // Launch a browser and navigate to example.com
    await puppeteerClient.useTool('launch_browser', {});
    console.log('Browser launched');
    
    await puppeteerClient.useTool('navigate', {
      url: 'https://example.com'
    });
    console.log('Navigated to example.com');
    
    // Take a screenshot and save it
    const screenshotResult = await puppeteerClient.useTool('screenshot', {});
    
    // Save the screenshot to a file
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }
    
    const screenshotPath = path.join(screenshotDir, `puppeteer-test-${Date.now()}.png`);
    fs.writeFileSync(screenshotPath, Buffer.from(screenshotResult.data, 'base64'));
    console.log(`Screenshot saved to ${screenshotPath}`);
    
    // Close the browser
    await puppeteerClient.useTool('close_browser', {});
    console.log('Browser closed');
    
    await puppeteerClient.close();
    console.log('puppeteer server connection closed');
  } catch (error) {
    console.error('Error testing puppeteer server:', error.message);
    // Make sure to close the browser if an error occurs
    try {
      if (puppeteerClient) {
        await puppeteerClient.useTool('close_browser', {});
        await puppeteerClient.close();
      }
    } catch (closeError) {
      console.error('Error while closing browser:', closeError.message);
    }
  }
  
  console.log('\nMCP server testing completed');
}

testMCPServers().catch(console.error);