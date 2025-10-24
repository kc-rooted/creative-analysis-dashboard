import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const REPORTS_FOLDER_NAME = 'Rooted Analytics Reports';
const OWNER_EMAIL = process.env.GOOGLE_WORKSPACE_OWNER_EMAIL || 'kane@rootedsolutions.co';

async function setupDriveFolder() {
  try {
    console.log('🚀 Setting up Google Drive folder...\n');

    // Load service account credentials
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!keyPath) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
    }

    console.log(`📁 Loading credentials from: ${keyPath}`);
    const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    // Initialize Google Auth
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient as any });

    console.log('✅ Authenticated with Google Drive API\n');

    // Check if folder already exists
    console.log(`🔍 Checking if "${REPORTS_FOLDER_NAME}" folder exists...`);
    const folderSearchResponse = await drive.files.list({
      q: `name='${REPORTS_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink, owners)',
      pageSize: 10,
    });

    if (folderSearchResponse.data.files && folderSearchResponse.data.files.length > 0) {
      console.log(`\n⚠️  Folder "${REPORTS_FOLDER_NAME}" already exists!`);
      console.log('\nExisting folders found:');
      folderSearchResponse.data.files.forEach((file, index) => {
        console.log(`\n${index + 1}. Folder ID: ${file.id}`);
        console.log(`   Name: ${file.name}`);
        console.log(`   Link: ${file.webViewLink}`);
        console.log(`   Owners: ${file.owners?.map(o => o.emailAddress).join(', ') || 'Unknown'}`);
      });

      console.log('\n📝 Next Steps:');
      console.log(`1. Open one of the folders above in Google Drive`);
      console.log(`2. Click "Share" button`);
      console.log(`3. Add this email with "Editor" access:`);
      console.log(`   ${credentials.client_email}`);
      console.log(`4. Click "Send"`);
      console.log(`\nThen try the export again!`);

      return;
    }

    // Create folder in service account's Drive
    console.log(`\n📂 Creating folder "${REPORTS_FOLDER_NAME}"...`);
    const folderResponse = await drive.files.create({
      requestBody: {
        name: REPORTS_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id, webViewLink',
    });

    const folderId = folderResponse.data.id!;
    const folderLink = folderResponse.data.webViewLink!;

    console.log(`✅ Folder created! ID: ${folderId}`);

    // Transfer ownership to your account
    console.log(`\n🔄 Transferring ownership to ${OWNER_EMAIL}...`);
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        type: 'user',
        role: 'owner',
        emailAddress: OWNER_EMAIL,
      },
      transferOwnership: true,
    });

    console.log(`✅ Ownership transferred!`);

    // Share with organization
    console.log(`\n🌐 Sharing with @rootedsolutions.co organization...`);
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        type: 'domain',
        role: 'reader',
        domain: 'rootedsolutions.co',
      },
    });

    console.log(`✅ Shared with organization!`);

    console.log('\n🎉 Setup Complete!\n');
    console.log('Folder Details:');
    console.log(`  Name: ${REPORTS_FOLDER_NAME}`);
    console.log(`  ID: ${folderId}`);
    console.log(`  Link: ${folderLink}`);
    console.log(`  Owner: ${OWNER_EMAIL}`);
    console.log(`  Organization Access: Read-only for @rootedsolutions.co`);

    console.log('\n📝 Next Steps:');
    console.log(`1. Open the folder: ${folderLink}`);
    console.log(`2. Click "Share" button`);
    console.log(`3. Add the service account with "Editor" access:`);
    console.log(`   ${credentials.client_email}`);
    console.log(`4. Click "Send"`);
    console.log(`\nAfter this, the export will work automatically!`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
    process.exit(1);
  }
}

setupDriveFolder();
