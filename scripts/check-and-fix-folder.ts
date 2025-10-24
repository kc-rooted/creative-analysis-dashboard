import { google } from 'googleapis';
import * as fs from 'fs';

const REPORTS_FOLDER_NAME = 'Rooted Analytics Reports';
const OWNER_EMAIL = 'kane@rootedsolutions.co';

async function checkAndFixFolder() {
  try {
    console.log('🔍 Checking folder ownership and permissions...\n');

    // Load service account credentials
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
    const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient as any });

    // Find the folder
    const folderSearchResponse = await drive.files.list({
      q: `name='${REPORTS_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, owners, permissions)',
      pageSize: 1,
    });

    if (!folderSearchResponse.data.files || folderSearchResponse.data.files.length === 0) {
      console.log('❌ Folder not found!');
      return;
    }

    const folder = folderSearchResponse.data.files[0];
    const folderId = folder.id!;

    console.log('📂 Found folder:');
    console.log(`   ID: ${folderId}`);
    console.log(`   Name: ${folder.name}`);
    console.log(`   Link: https://drive.google.com/drive/folders/${folderId}`);

    // Get detailed permissions
    const permissionsResponse = await drive.permissions.list({
      fileId: folderId,
      fields: 'permissions(id, emailAddress, role, type)',
    });

    console.log('\n👥 Current Permissions:');
    const permissions = permissionsResponse.data.permissions || [];
    let hasKaneOwner = false;
    let serviceAccountPermId: string | undefined;

    permissions.forEach((perm) => {
      const roleEmoji = perm.role === 'owner' ? '👑' : perm.role === 'writer' ? '✏️' : '👁️';
      console.log(`   ${roleEmoji} ${perm.emailAddress || perm.type} - ${perm.role}`);

      if (perm.emailAddress === OWNER_EMAIL && perm.role === 'owner') {
        hasKaneOwner = true;
      }

      if (perm.emailAddress === credentials.client_email) {
        serviceAccountPermId = perm.id;
      }
    });

    console.log('\n');

    if (hasKaneOwner) {
      console.log('✅ Kane is already the owner!');
      console.log('\nℹ️  The folder is properly configured.');
      console.log('   Files created in this folder will use Kane\'s storage quota.');
    } else {
      console.log('⚠️  Kane is NOT the owner!');
      console.log('\n📝 MANUAL STEPS REQUIRED:');
      console.log('The service account cannot transfer ownership. You must do this manually:\n');
      console.log('1. Open: https://drive.google.com/drive/folders/' + folderId);
      console.log('2. Click "Share" (or right-click → Share)');
      console.log('3. Add kane@rootedsolutions.co as "Owner"');
      console.log('4. Transfer ownership to Kane');
      console.log('5. Then add the service account back as "Editor":');
      console.log(`   ${credentials.client_email}`);
    }

    // Check if service account has editor access
    const serviceAccountPerm = permissions.find(p => p.emailAddress === credentials.client_email);
    if (!serviceAccountPerm) {
      console.log('\n⚠️  Service account does NOT have access to this folder!');
      console.log('\n📝 ADD SERVICE ACCOUNT:');
      console.log('1. Open: https://drive.google.com/drive/folders/' + folderId);
      console.log('2. Click "Share"');
      console.log('3. Add this email with "Editor" role:');
      console.log(`   ${credentials.client_email}`);
    } else if (serviceAccountPerm.role === 'owner') {
      console.log('\n🔄 Service account is the owner. Need to transfer to Kane first.');
    } else if (serviceAccountPerm.role === 'writer') {
      console.log('\n✅ Service account has Editor access!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
    process.exit(1);
  }
}

checkAndFixFolder();
