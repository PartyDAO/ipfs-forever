FROM ipfs/kubo:latest
COPY init.sh /container-init.d/001-config.sh
RUN chmod +x /container-init.d/001-config.sh
COPY cids.json /cids.json
