FROM node:16-alpine as npm_dev
WORKDIR /ws
COPY package.json package-lock.json /ws/
RUN npm i --ignore-scripts --prefer-offline --no-audit
RUN find node_modules -path '*/esbuild/install.js' | xargs -rt -n 1 node
COPY . /ws/
RUN npm run postinstall
RUN npm run build

FROM node:16-alpine as npm_final
WORKDIR /ws
COPY package-lock.json npm-selective-install.js /ws/
RUN node npm-selective-install -g express

FROM node:16-alpine as final
COPY --from=npm_final /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=npm_dev /ws/dist/apps/front-end/* /dist/
COPY --from=npm_dev /ws/dist/apps/back-end/* /dist/
ARG DISPLAY_VERSION=not_set
ENV DISPLAY_VERSION=${DISPLAY_VERSION} NODE_PATH=/usr/local/lib/node_modules
EXPOSE 8000
CMD ["node", "/dist/server.js"]
