#!/bin/bash
# Quick setup script to configure MongoDB and test connection

echo "=========================================="
echo "CHANAKYA AUTOMATION - ENVIRONMENT SETUP"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "❌ Error: backend/.env not found!"
    exit 1
fi

echo "✅ Found backend/.env"
echo ""
echo "Current MongoDB URL:"
grep "^MONGO_URL=" backend/.env
echo ""

echo "Please provide your MongoDB connection string:"
echo "(From MongoDB Atlas: Connect → Drivers → Copy connection string)"
echo ""
echo "Example format:"
echo "mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/forgevoice_prod?retryWrites=true&w=majority"
echo ""
read -p "Paste your MongoDB URL here: " MONGO_URL

if [ -z "$MONGO_URL" ]; then
    echo "❌ No URL provided. Exiting."
    exit 1
fi

# Check if URL contains forgevoice_prod
if [[ ! "$MONGO_URL" =~ "forgevoice_prod" ]]; then
    echo ""
    echo "⚠️  Warning: URL doesn't contain 'forgevoice_prod' database name"
    echo "   Adding it now..."
    # Add /forgevoice_prod before the ?
    MONGO_URL=$(echo "$MONGO_URL" | sed 's|\(mongodb+srv://[^?]*\)|\1/forgevoice_prod|')
fi

echo ""
echo "Updated MongoDB URL (password hidden):"
echo "$MONGO_URL" | sed 's/:[^@]*@/:***@/'
echo ""

# Update .env file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^MONGO_URL=.*|MONGO_URL=$MONGO_URL|" backend/.env
else
    # Linux
    sed -i "s|^MONGO_URL=.*|MONGO_URL=$MONGO_URL|" backend/.env
fi

echo "✅ Updated backend/.env with MongoDB URL"
echo ""
echo "=========================================="
echo "VERIFICATION"
echo "=========================================="
echo ""

# Show all configured keys
echo "Checking configured API keys:"
echo ""

grep "^FAL_KEY=" backend/.env | sed 's/=.*/=*** (configured)/' && echo "  ✅ FAL_KEY" || echo "  ❌ FAL_KEY missing"
grep "^GEMINI_API_KEY=" backend/.env | sed 's/=.*/=*** (configured)/' && echo "  ✅ GEMINI_API_KEY" || echo "  ❌ GEMINI_API_KEY missing"
grep "^ELEVENLABS_API_KEY=" backend/.env | sed 's/=.*/=*** (configured)/' && echo "  ✅ ELEVENLABS_API_KEY" || echo "  ❌ ELEVENLABS_API_KEY missing"
grep "^MONGO_URL=" backend/.env | grep -v "USERNAME:PASSWORD" | sed 's/=.*/=*** (configured)/' && echo "  ✅ MONGO_URL" || echo "  ❌ MONGO_URL still has placeholder"

echo ""
echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "1. Set up Chanakya channel profile:"
echo "   cd backend && python3 setup_chanakya_profile.py"
echo ""
echo "2. Set up YouTube OAuth (get credentials from):"
echo "   https://console.cloud.google.com/"
echo ""
echo "3. Test Short generation:"
echo "   cd backend && python3 test_chanakya_automation.py"
echo ""
