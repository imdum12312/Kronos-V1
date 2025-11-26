#!/bin/bash

echo "Starting Kronos setup..."

OS=$(uname -s)

echo "Cloning Kronos repo..."
git clone https://github.com/neil323423/Kronos-V1
cd Kronos-V1 || exit

echo "Checking for Node.js..."
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing..."

    if [[ "$OS" == "Linux" ]]; then
        sudo apt update
        sudo apt install -y nodejs npm

    elif [[ "$OS" == "Darwin" ]]; then
        brew install node

    elif [[ "$OS" == "MINGW"* || "$OS" == "CYGWIN"* ]]; then
        echo "Windows detected (Git Bash)"
        echo "Downloading Node.js installer..."
        curl -L -o node-installer.msi https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi
        
        echo "Running installer..."
        msiexec //i node-installer.msi //qn

        echo "Node.js installer finished. Restart Git Bash if node still not found."

    else
        echo "Your OS is not supported. Please install Node manually."
        exit 1
    fi
else
    echo "Node.js found!"
fi

echo "Updating npm..."
npm install -g npm

echo "Installing dependencies..."
npm install express --save

echo "Setup complete! Running Kronos..."
node index.js
