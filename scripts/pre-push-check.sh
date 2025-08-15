#!/bin/bash

echo "🔒 Pre-Push Security Check"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env is in .gitignore
if grep -q "^\.env$" .gitignore; then
    echo -e "${GREEN}✅ .env is in .gitignore${NC}"
else
    echo -e "${RED}❌ .env is NOT in .gitignore${NC}"
    exit 1
fi

# Check if .env.example exists and has placeholder values
if [ -f ".env.example" ]; then
    if grep -q "1234567890:ABC" .env.example; then
        echo -e "${GREEN}✅ .env.example has placeholder values${NC}"
    else
        echo -e "${RED}❌ .env.example may contain real sensitive data${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ .env.example file missing${NC}"
    exit 1
fi

# Check for sensitive files that shouldn't be committed
SENSITIVE_FILES=("secrets.json" "config.json" ".env.local" ".env.production" "private.key" "wallet.json")
for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${RED}❌ Sensitive file found: $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ No sensitive files found${NC}"

# Check if data directory is ignored
if grep -q "^data/" .gitignore; then
    echo -e "${GREEN}✅ data/ directory is in .gitignore${NC}"
else
    echo -e "${YELLOW}⚠️  data/ directory should be in .gitignore${NC}"
fi

# Check if node_modules is ignored
if grep -q "node_modules/" .gitignore; then
    echo -e "${GREEN}✅ node_modules/ is in .gitignore${NC}"
else
    echo -e "${RED}❌ node_modules/ is NOT in .gitignore${NC}"
    exit 1
fi

# Check for any .env files in git staging
if git diff --cached --name-only | grep -q "^\.env$"; then
    echo -e "${RED}❌ .env file is staged for commit!${NC}"
    echo "Run: git reset HEAD .env"
    exit 1
fi

# Check for any database files in git staging
if git diff --cached --name-only | grep -q "\.db$\|\.sqlite$"; then
    echo -e "${RED}❌ Database files are staged for commit!${NC}"
    echo "Run: git reset HEAD data/"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All security checks passed!${NC}"
echo -e "${GREEN}✅ Safe to push to GitHub${NC}"
echo ""
echo "Commands to push:"
echo "git add ."
echo "git commit -m \"Initial commit: Aura Farming Bot with ERC-4337 and Web App\""
echo "git push origin main"
