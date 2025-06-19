// npx dotenvx run -f .env.development -f .env.local -- tsx scripts/test-agent-endpoint.ts [orgId] [agent] [baseUrl]

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

import { agents, users } from '@/db/schema';
import { getAgentToken } from '@/lib/server/agent-auth';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

interface TestConfig {
  orgId: string;
  agentName: string;
  baseUrl: string;
}

async function createTestAgent(config: TestConfig): Promise<string> {
  console.log('🤖 Creating test agent...');

  try {
    const existingAgent = await db
      .select()
      .from(agents)
      .where(eq(agents.displayName, config.agentName))
      .limit(1);

    if (existingAgent.length > 0) {
      console.log(`✅ Using existing agent: ${existingAgent[0]!.id}`);
      return existingAgent[0]!.id;
    }

    const existingUsers = await db.select().from(users).limit(1);
    let createdByUserId: string;

    if (existingUsers.length > 0) {
      createdByUserId = existingUsers[0]!.id;
      console.log(`📋 Using existing user as creator: ${createdByUserId}`);
    } else {
      const testUserId = `user_${crypto.randomBytes(12).toString('hex')}`;

      const testUserData = {
        id: testUserId,
        orgId: config.orgId,
        orgRole: 'admin',
        name: 'Test User',
        email: 'test@example.com',
        imageUrl: 'https://example.com/avatar.png',
        entity: {},
      };

      console.log(`👤 Creating test user: ${testUserId}`);
      const [newUser] = await db.insert(users).values(testUserData).returning();
      createdByUserId = newUser!.id;
    }

    const agentId = `agent_${crypto.randomBytes(12).toString('hex')}`;

    const agentData = {
      id: agentId,
      orgId: config.orgId,
      displayName: config.agentName,
      description: 'Test agent created by script',
      createdByUserId: createdByUserId,
    };

    const [newAgent] = await db.insert(agents).values(agentData).returning();

    if (!newAgent) {
      throw new Error('Failed to create agent in database');
    }

    console.log(`✅ Created agent: ${newAgent.id}`);
    return newAgent.id;
  } catch (error) {
    console.error('❌ Failed to create agent:', error);
    throw error;
  }
}

async function testEndpoint(token: string, baseUrl: string) {
  console.log('🌐 Testing endpoint...');

  const url = `${baseUrl}/api/me`;
  console.log(`📡 Request URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TestScript/1.0',
      },
    });

    console.log(
      `📡 Response status: ${response.status} ${response.statusText}`,
    );

    console.log(
      `📡 Response content-type: ${response.headers.get('content-type')}`,
    );

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (isJson) {
      const responseData = await response.json();

      if (response.ok) {
        console.log('✅ Success! Response data:');
        console.log(JSON.stringify(responseData, null, 2));
      } else {
        console.log('❌ Error response:');
        console.log(JSON.stringify(responseData, null, 2));
      }
    } else {
      const responseText = await response.text();

      if (response.status === 404) {
        console.log('❌ Endpoint not found (404)');
        console.log('💡 This might mean:');
        console.log('   - The server is not running');
        console.log('   - The endpoint does not exist');
        console.log('   - The API route is not implemented');
        console.log(
          `📄 Response preview: ${responseText.substring(0, 200)}...`,
        );
      } else {
        console.log(`❌ Non-JSON response (${response.status})`);
        console.log(`📄 Response: ${responseText.substring(0, 500)}...`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to call endpoint:', error);

    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.log(
        '💡 Connection refused - is the server running on http://localhost:3000?',
      );
    }

    throw error;
  }
}

async function cleanup(agentId: string): Promise<void> {
  console.log('🧹 Cleaning up test agent...');

  try {
    await db.delete(agents).where(eq(agents.id, agentId));
    console.log('✅ Test agent cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup agent:', error);
  }
}

async function main() {
  const config: TestConfig = {
    orgId: process.argv[2] || 'org_2wbhchVXZMQl8OS1yt0mrDazCpW',
    agentName: process.argv[3] || 'TestAgent',
    baseUrl: process.argv[4] || 'http://localhost:3000',
  };

  console.log('🚀 Starting agent endpoint test...');
  console.log(`   Org ID: ${config.orgId}`);
  console.log(`   Agent Name: ${config.agentName}`);
  console.log(`   Base URL: ${config.baseUrl}`);
  console.log('');

  let agentId: string | null = null;

  try {
    agentId = await createTestAgent(config);
    const token = await getAgentToken(agentId, config.orgId);
    await testEndpoint(token, config.baseUrl);

    console.log('');
    console.log('🎉 Test completed successfully!');
  } catch (error) {
    console.error('');
    console.error('💥 Test failed:', error);
    process.exit(1);
  } finally {
    if (agentId) {
      await cleanup(agentId);
    }

    await client.end();
  }
}

// Print usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: tsx scripts/test-agent-endpoint.ts [orgId] [agentName] [baseUrl]

Arguments:
  orgId     - Organization ID to test with (default: org_default_test)
  agentName - Name for the test agent (default: TestAgent)
  baseUrl   - Base URL of the API (default: http://localhost:3000)

Examples:
  tsx scripts/test-agent-endpoint.ts
  tsx scripts/test-agent-endpoint.ts org_123 MyTestAgent http://localhost:3000
  tsx scripts/test-agent-endpoint.ts org_456 ProductionAgent https://api.example.com

Environment Variables Required:
  DATABASE_URL - PostgreSQL connection string
  CLERK_SECRET_KEY - Clerk secret key for JWT signing
`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
