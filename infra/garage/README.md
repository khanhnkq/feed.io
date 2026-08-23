# Garage bootstrap

The development container starts one Garage node with replication factor `1`. After the first start, assign capacity and create the media bucket/key using the commands for the pinned Garage version:

```bash
docker compose -f infra/compose/compose.dev.yaml exec garage /garage status
docker compose -f infra/compose/compose.dev.yaml exec garage /garage layout assign -z dc1 -c 10G <node-id>
docker compose -f infra/compose/compose.dev.yaml exec garage /garage layout apply --version 1
docker compose -f infra/compose/compose.dev.yaml exec garage /garage bucket create feedio-media
docker compose -f infra/compose/compose.dev.yaml exec garage /garage key create feedio-app
```

Production must use three nodes in separate failure zones. Never reuse development secrets.
