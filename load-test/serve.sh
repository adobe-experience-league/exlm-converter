cd ..

echo "Starting server in production mode"
export NODE_ENV=production
export LOCAL_CONVERTER=true
node --prof ./build/express.js