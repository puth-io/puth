FROM node:14 AS build

WORKDIR /build

COPY . .

RUN npm run image:install && \
    npm run image:build && \
    npm run image:cleanup


FROM node:14

RUN echo "deb http://mirror.de.leaseweb.net/debian/ stretch main" > /etc/apt/sources.list && \
    echo "deb http://security.debian.org/debian-security stretch/updates main" >> /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian stretch-updates main" >> /etc/apt/sources.list

RUN apt-get update && \
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

COPY --from=build /build .

EXPOSE 7345

ENTRYPOINT ["/usr/local/bin/node", "bin/puth.js"]

CMD ["start", "-p", "7345", "-a", "0.0.0.0", "--disable-cors"]