#!/bin/bash

echo "Starting Kronos setup..."

# Check OS type
OS=$(uname -s)

# Clone the repo
echo "Cloning Kronos repo..."
git clone https://github.com/neil323423/Kronos-V1 & pid=$!
while kill -0 $pid 2>/dev/null; do
    echo -n "."
    sleep 1
done
echo " Done!"

cd Kronos-V1 || exit

# Check if Node.js is installed
echo "Checking for Node.js..."
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing..."
    if [[ "$OS" == "Linux" ]]; then
        sudo apt update
        sudo apt install -y nodejs npm
    elif [[ "$OS" == "Darwin" ]]; then
        brew install node
    else
        echo "Please install Node.js manually for your OS."
        exit 1
    fi
else
    echo "Node.js found!"
fi

# Update npm
echo "Updating npm..."
npm install -g npm & pid=$!
while kill -0 $pid 2>/dev/null; do
    echo -n "."
    sleep 1
done
echo " Done!"

# Install dependencies
echo "Installing dependencies..."
npm install express --save & pid=$!
while kill -0 $pid 2>/dev/null; do
    echo -n "."
    sleep 1
done
echo " Done!"

echo "Setup complete! Running Kronos..."
node index.js
