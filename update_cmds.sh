add_command() {
  url="https://discord.com/api/v8/applications/$APPLICATION_ID/commands"

  if [ ! -z "$GUILD" ]; then
    url="https://discord.com/api/v8/applications/$APPLICATION_ID/guilds/$GUILD/commands"
  fi

  curl -s \
    --url "$url" \
    -X POST \
    -H "Authorization: Bot $DISCORD_TOKEN" \
    -H "Content-Type: application/json" \
    -d @"$1" \
    | jq
}

for file in ./cmds/*.json; do
  add_command $file
done
