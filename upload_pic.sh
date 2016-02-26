#!/usr/bin/env bash

# use ./upload_pic.sh e98kivp4ot0eojn769sjkisro5 PATH_TO_FILE

echo -n `basename ${@:2:1}` " " && curl -s --cookie "habrastorage_sid=${@:1:1}" --form "files[]=@${@:2:1}" --header 'X-Requested-With: XMLHttpRequest' --header 'Referer: https://habrastorage.org/' --request POST https://habrastorage.org/main/upload | egrep -o 'url[^,]*' | sed 's/"$//;s/.*"//;s/\\//g;s=^=='
