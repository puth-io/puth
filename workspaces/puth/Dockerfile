FROM node:24-slim

RUN apt-get update && \
    apt-get clean && \
    apt-get install -y ca-certificates \
        fonts-liberation \
        libappindicator3-1 \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libc6 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libexpat1 \
        libfontconfig1 \
        libgbm1 \
        libgcc1 \
        libglib2.0-0 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libstdc++6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libxtst6 \
        lsb-release \
        wget \
        xdg-utils

WORKDIR /puth

COPY . .

# removes devDependencies from package.json because npm install with omit dev still searches for the "@puth/client" in
# the npm registry but that package does not exist. You have to love npm.
RUN npm pkg delete devDependencies
RUN npm install --omit=dev
RUN npm -w puth run ci:browser:install

EXPOSE 7345

ENTRYPOINT ["/usr/local/bin/node", "dist/cli.mjs"]

CMD ["start", "--port", "7345", "--address", "0.0.0.0", "--disable-cors"]
