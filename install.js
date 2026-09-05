#!/usr/bin/env node

/**
 * Installation script for dsh-web-search-zhipu
 * This script helps users set up the plugin
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Welcome to dsh-web-search-zhipu installation!');
console.log('===============================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
    console.error('❌ Error: package.json not found. Please run this script from the plugin directory.');
    process.exit(1);
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

console.log(`📦 Plugin: ${packageJson.name}`);
console.log(`📝 Version: ${packageJson.version}`);
console.log(`📄 Description: ${packageJson.description}\n`);

// Check dependencies
console.log('🔍 Checking dependencies...');
const dependencies = packageJson.dependencies || {};
let allDependenciesExist = true;

for (const [dep, version] of Object.entries(dependencies)) {
    try {
        const packagePath = path.join('node_modules', dep, 'package.json');
        if (fs.existsSync(packagePath)) {
            console.log(`✅ ${dep}: ${version}`);
        } else {
            console.log(`❌ ${dep}: ${version} (not installed)`);
            allDependenciesExist = false;
        }
    } catch (error) {
        console.log(`❌ ${dep}: ${version} (error checking)`);
        allDependenciesExist = false;
    }
}

if (!allDependenciesExist) {
    console.log('\n📦 Installing missing dependencies...');
    const { spawn } = require('child_process');
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    
    const child = spawn(npm, ['install'], { stdio: 'inherit' });
    
    child.on('close', (code) => {
        if (code === 0) {
            console.log('\n✅ Dependencies installed successfully!');
            showNextSteps();
        } else {
            console.error('\n❌ Failed to install dependencies.');
            process.exit(1);
        }
    });
} else {
    console.log('\n✅ All dependencies are already installed!');
    showNextSteps();
}

function showNextSteps() {
    console.log('\n🎉 Installation completed successfully!');
    console.log('===============================================\n');
    console.log('📖 Next steps:');
    console.log('1. Configure your Zhipu API key');
    console.log('2. Add the plugin to your DeepSeek Harness configuration');
    console.log('3. Test the plugin functionality');
    console.log('\n📖 For detailed instructions, see README.md');
    console.log('📖 For publishing instructions, see PUBLISHING_GUIDE.md\n');
}

module.exports = { showNextSteps };