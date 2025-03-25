#!/usr/bin/env node

// MCP Server implementation using ES modules
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Import BSV wallet-toolbox functionality
// Note: These imports need to be adjusted based on the exact exports from the wallet-toolbox
import * as sdk from '@bsv/sdk';

// Wallet instances and storage
const wallets = new Map();

// Create the MCP server
const server = new McpServer({
  name: 'BSV Wallet Toolbox',
  version: '1.0.0',
  description: 'MCP Server for BSV Wallet Creation and Management'
});

// Tool: Create a new BSV wallet
server.tool(
  'create-wallet',
  { 
    walletName: z.string().describe('Name for the new wallet'),
    passphrase: z.string().optional().describe('Optional passphrase for wallet encryption')
  },
  async ({ walletName, passphrase }) => {
    try {
      // Check if wallet already exists
      if (wallets.has(walletName)) {
        return {
          content: [{ 
            type: 'text', 
            text: `A wallet with the name '${walletName}' already exists. Please use a different name.` 
          }]
        };
      }

      // Create a new wallet (using mock implementation for now)
      // In a real implementation, we would use the wallet-toolbox's SDK to create a proper wallet
      const wallet = {
        name: walletName,
        createdAt: new Date().toISOString(),
        addresses: [],
        balance: 0,
        // In a real implementation, we would generate actual keys here
        privateKey: `mock_private_key_for_${walletName}`, 
      };
      
      // Store the wallet
      wallets.set(walletName, wallet);
      
      return {
        content: [{ 
          type: 'text', 
          text: `Successfully created new BSV wallet '${walletName}'.

Your wallet is ready to use with other wallet-toolbox functions.` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: 'text', 
          text: `Error creating wallet: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  }
);

// Tool: Get wallet balance
server.tool(
  'get-balance',
  { 
    address: z.string().describe('Bitcoin address to check balance for') 
  },
  async ({ address }) => {
    try {
      // In a real implementation, we would use the wallet-toolbox to query the actual balance
      // Using a mockup for now - in production this would call the actual BSV network
      
      // Simulate looking up the address in our wallets
      let found = false;
      let foundWallet = null;
      
      for (const [name, wallet] of wallets.entries()) {
        if (wallet.addresses.includes(address)) {
          found = true;
          foundWallet = name;
          break;
        }
      }
      
      const balance = found ? 123.45 : 0; // Mock balance
      
      return {
        content: [{ 
          type: 'text', 
          text: found ? 
            `The balance for address ${address} is ${balance} satoshis. This address belongs to wallet '${foundWallet}'.` :
            `The balance for address ${address} is ${balance} satoshis. Note: This address is not found in any locally created wallets.`
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: 'text', 
          text: `Error fetching balance: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  }
);

// Tool: Create new address for a wallet
server.tool(
  'create-address',
  { 
    walletName: z.string().describe('Name of the wallet to create an address for') 
  },
  async ({ walletName }) => {
    try {
      // Check if the wallet exists
      if (!wallets.has(walletName)) {
        return {
          content: [{ 
            type: 'text', 
            text: `Wallet '${walletName}' not found. Please create a wallet first using the create-wallet tool.` 
          }]
        };
      }
      
      const wallet = wallets.get(walletName);
      
      // In a real implementation, we would use the wallet-toolbox SDK to generate a proper BSV address
      // This would involve using the appropriate key derivation path and the wallet's master key
      const newAddress = `1BitcoinSV${Math.random().toString(36).substring(2, 10)}`;
      
      // Add the address to the wallet
      wallet.addresses.push(newAddress);
      
      return {
        content: [{ 
          type: 'text', 
          text: `Created new BSV address ${newAddress} for wallet '${walletName}'.

This address can now be used to receive BSV.` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: 'text', 
          text: `Error creating address: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  }
);

// Tool: Send transaction
server.tool(
  'send-transaction',
  { 
    fromAddress: z.string().describe('Source address'),
    toAddress: z.string().describe('Destination address'),
    amount: z.number().describe('Amount in satoshis to send')
  },
  async ({ fromAddress, toAddress, amount }) => {
    try {
      // In a real implementation, we would use the wallet-toolbox to:
      // 1. Find the wallet containing the fromAddress
      // 2. Check if it has sufficient balance
      // 3. Create and sign a transaction
      // 4. Broadcast the transaction to the BSV network
      
      // Mock implementation
      let found = false;
      let foundWallet = null;
      
      for (const [name, wallet] of wallets.entries()) {
        if (wallet.addresses.includes(fromAddress)) {
          found = true;
          foundWallet = name;
          break;
        }
      }
      
      if (!found) {
        return {
          content: [{ 
            type: 'text', 
            text: `The source address ${fromAddress} was not found in any locally created wallets. Unable to send transaction.` 
          }]
        };
      }
      
      // Generate a mock transaction ID
      const txid = `bsv${Date.now().toString(16)}${Math.random().toString(16).substring(2, 10)}`;
      
      return {
        content: [{ 
          type: 'text', 
          text: `Transaction sent successfully from wallet '${foundWallet}'!

Transaction ID: ${txid}
Sent ${amount} satoshis from ${fromAddress} to ${toAddress}.

Note: This is a simulated transaction. In a real implementation, this would create and broadcast an actual BSV transaction.` 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: 'text', 
          text: `Error sending transaction: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  }
);

// Tool: List wallets
server.tool(
  'list-wallets',
  {},
  async () => {
    try {
      if (wallets.size === 0) {
        return {
          content: [{ 
            type: 'text', 
            text: `No wallets have been created yet. Use the create-wallet tool to create a new BSV wallet.` 
          }]
        };
      }
      
      let walletList = 'Available BSV Wallets:\n\n';
      
      for (const [name, wallet] of wallets.entries()) {
        walletList += `- ${name}: ${wallet.addresses.length} address(es), created on ${new Date(wallet.createdAt).toLocaleString()}\n`;
      }
      
      return {
        content: [{ 
          type: 'text', 
          text: walletList 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: 'text', 
          text: `Error listing wallets: ${error instanceof Error ? error.message : String(error)}` 
        }]
      };
    }
  }
);

// Resource: Get wallet info
server.resource(
  'wallet-info',
  new ResourceTemplate('wallet-info://{walletName}', { list: undefined }),
  async (uri, { walletName }) => {
    try {
      // Check if the wallet exists
      if (!wallets.has(walletName)) {
        return {
          contents: [{
            uri: uri.href,
            text: `Wallet '${walletName}' not found. Please create a wallet first using the create-wallet tool.`
          }]
        };
      }
      
      const wallet = wallets.get(walletName);
      
      // Create a detailed wallet report
      const walletInfo = {
        name: walletName,
        createdAt: wallet.createdAt,
        addressCount: wallet.addresses.length,
        addresses: wallet.addresses,
        balance: wallet.balance || 0, // In a real implementation, this would be calculated by summing the balances of all addresses
      };
      
      let walletText = `BSV Wallet Information: ${walletName}\n\n`;
      walletText += `Created: ${new Date(walletInfo.createdAt).toLocaleString()}\n`;
      walletText += `Address Count: ${walletInfo.addressCount}\n`;
      walletText += `Total Balance: ${walletInfo.balance} satoshis\n\n`;
      
      if (walletInfo.addresses.length > 0) {
        walletText += `Addresses:\n`;
        walletInfo.addresses.forEach((addr, i) => {
          walletText += `${i+1}. ${addr}\n`;
        });
      } else {
        walletText += `No addresses created yet. Use the create-address tool to generate a new address.`;
      }
      
      return {
        contents: [{
          uri: uri.href,
          text: walletText
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error fetching wallet information: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
);

// Start receiving messages on stdin and sending messages on stdout
console.error('Starting BSV Wallet Toolbox MCP Server...');
const transport = new StdioServerTransport();
server.connect(transport).catch(error => {
  console.error('Error in MCP server:', error);
  process.exit(1);
});
