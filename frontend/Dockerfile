FROM node:20-alpine@sha256:09e2b3d9726018aecf269bd35325f46bf75046a643a66d28360ec71132750ec8 AS deps

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS test

COPY . .

# Ensure CRA/Jest runs once and exits.
ENV CI=true

CMD ["npm", "run", "test:ci"]

FROM deps AS build

COPY . .

# CRA env vars are baked into the build output.
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

FROM nginx:1.27-alpine@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10 AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/build /usr/share/nginx/html

EXPOSE 80

