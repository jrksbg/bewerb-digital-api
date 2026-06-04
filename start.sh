#!/bin/sh

# Run pending database migrations
npx prisma migrate deploy

# Start Server
node ./src/app.mjs
