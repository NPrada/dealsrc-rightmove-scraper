# dealsrc-rightmove-loader

This is a loader that will scrape all of the open listings on rightmove and will load them into a postgres database

running the local postgres databse
```docker run --name dealsrc-postgres -e POSTGRES_USER=niccolo -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=postgres -p 5432:5432 -v dealsrc-postgres:/var/lib/postgresql/data -d postgres```
