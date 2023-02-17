FROM node:19

RUN apt-get update -qq && \
    apt-get install -yq \
    bash \
    curl \
    ffmpeg \
    tmux

RUN curl -sL https://github.com/DarthSim/overmind/releases/download/v2.4.0/overmind-v2.4.0-linux-amd64.gz | gunzip > /usr/local/bin/overmind && \
    chmod +x /usr/local/bin/overmind

RUN mkdir -p /src
WORKDIR /src

COPY package* /src
RUN npm install
COPY . /src

#CMD supervisord -c /src/supervisor.conf
CMD overmind start -r broadcaster,writer
