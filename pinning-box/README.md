# Running

`fly deploy`

`fly ssh console`

`nohup sh -c 'grep -o "\"[^\"]*\"" /cids.json | tr -d "\"" | grep -v "^\[" | xargs -P 10 -I {} ipfs pin add {}' > /data/ipfs/pin-log.txt 2>&1 &`

`tail -f /data/ipfs/pin-log.txt`

`wc -l /data/ipfs/pin-log.txt`
