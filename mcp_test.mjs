// MCP test script using ES modules
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Use createRequire for CommonJS-style imports where needed
const require = createRequire(import.meta.url);

// Get file path info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import MCP SDK - using dynamic import for compatibility
const mcpSdk = await import('@modelcontextprotocol/sdk');
const { Client } = mcpSdk;
const { StdioClientTransport } = mcpSdk;

async function testMCPServers() {
  console.log('Testing MCP connections...');
  
  // Test basic-memory server
  try {
    console.log('\n===== Testing basic-memory server =====');
    const memoryProcess = spawn('bash', ['-c', 'cd mcp_servers/basic-memory && source venv/bin/activate && python -m src.basic_memory.mcp.main'], { 
      stdio: ['pipe', 'pipe', process.stderr] 
    });
    
    const memoryTransport = new StdioClientTransport(memoryProcess);
    const memoryClient = new Client(memoryTransport);
    
    await memoryClient.connect();
    console.log('✅ Connected to basic-memory server successfully!');
    
    const memoryTools = await memoryClient.listTools();
    console.log(`📋 Available basic-memory tools: ${memoryTools.tools.map(t => t.name).join(', ')}`);
    
    const memoryResources = await memoryClient.listResources();
    console.log(`📋 Available basic-memory resources: ${memoryResources.resources.map(r => r.uri).join(', ')}`);
    
    // Test writing a note
    console.log('\n🔹 Testing write_note tool...');
    const testNote = {
      title: "Test Note",
      content: "This is a test note created on " + new Date().toISOString()
    };
    
    try {
      const writeResult = await memoryClient.useTool('write_note', {
        title: testNote.title,
        content: testNote.content
      });
      console.log('✅ Write note result:', writeResult);
      
      // Test reading the note back
      console.log('\n🔹 Testing read_note tool...');
      const readResult = await memoryClient.useTool('read_note', {
        title: testNote.title
      });
      console.log('✅ Read note result:', readResult);
      
      // Verify the content matches what we wrote
      if (readResult.content.includes(testNote.content)) {
        console.log('\n✅ Successfully verified note content!');
      } else {
        console.log('\n❌ Note content verification failed!');
      }
    } catch (toolError) {
      console.error('❌ Error using basic-memory tools:', toolError);
    }
    
    await memoryClient.close();
    console.log('✅ basic-memory server connection closed');
  } catch (error) {
    console.error('❌ Error testing basic-memory server:', error);
  }
  
  // Test puppeteer server
  let puppeteerClient = null;
  try {
    console.log('\n===== Testing puppeteer server =====');
    const puppeteerProcess = spawn('npx', ['-y', '@modelcontextprotocol/server-puppeteer'], { 
      stdio: ['pipe', 'pipe', process.stderr] 
    });
    
    const puppeteerTransport = new StdioClientTransport(puppeteerProcess);
    puppeteerClient = new Client(puppeteerTransport);
    
    await puppeteerClient.connect();
    console.log('✅ Connected to puppeteer server successfully!');
    
    const puppeteerTools = await puppeteerClient.listTools();
    console.log(`📋 Available puppeteer tools: ${puppeteerTools.tools.map(t => t.name).join(', ')}`);
    
    const puppeteerResources = await puppeteerClient.listResources();
    console.log(`📋 Available puppeteer resources: ${puppeteerResources.resources.map(r => r.uri).join(', ')}`);
    
    // Test website navigation and screenshot
    console.log('\n🔹 Testing browser navigation and screenshot...');
    
    // Launch a browser and navigate to example.com
    await puppeteerClient.useTool('launch_browser', {});
    console.log('✅ Browser launched');
    
    await puppeteerClient.useTool('navigate', {
      url: 'https://example.com'
    });
    console.log('✅ Navigated to example.com');
    
    // Take a screenshot and save it
    const screenshotResult = await puppeteerClient.useTool('screenshot', {});
    
    // Save the screenshot to a file
    const screenshotDir = join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir);
    }
    
    const screenshotPath = join(screenshotDir, `puppeteer-test-${Date.now()}.png`);
    fs.writeFileSync(screenshotPath, Buffer.from(screenshotResult.data, 'base64'));
    console.log(`✅ Screenshot saved to ${screenshotPath}`);
    
    // Close the browser
    await puppeteerClient.useTool('close_browser', {});
    console.log('✅ Browser closed');
    
    await puppeteerClient.close();
    console.log('✅ puppeteer server connection closed');
  } catch (error) {
    console.error('❌ Error testing puppeteer server:', error);
    // Make sure to close the browser if an error occurs
    if (puppeteerClient) {
      try {
        await puppeteerClient.useTool('close_browser', {}).catch(() => {});
        await puppeteerClient.close().catch(() => {});
      } catch (closeError) {
        // Ignore errors during cleanup
      }
    }
  }
  
  console.log('\n===== MCP server testing completed =====');
}

testMCPServers().catch(error => {
  console.error('Unhandled error in test script:', error);
  process.exit(1);
});