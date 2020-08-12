# sauce-party

Run example
```
docker-compose up --scale http=2
```

Contract examples

Regular session request
```
session             queued|1
```

Session with context
```
session|context     queued|2
```

Ticket response
```
ticket|d092af94-b3fe-4e8c-b2fc-5e0c4fcdb043|10000
```