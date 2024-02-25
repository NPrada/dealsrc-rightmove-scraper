# dealsrc-rightmove-loader

running the local postgres databse
```docker run --name dealsrc-postgres -e POSTGRES_USER=niccolo -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=postgres -p 5432:5432 -v dealsrc-postgres:/var/lib/postgresql/data -d postgres
```