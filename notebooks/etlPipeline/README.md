Format for running these files should be:

- first, run makeCells to get the file of clels

- then, run processBigHugeCSV (may be outdated) to get your CSV of crashes

- then, run createDehydratedRowsBetter to get crashes mapped to cells and negative label crashes. The code should probably be changed to have positive and negative labels in one big file instead of split

- the, run addRowWidth to get a new csv

- use the created csv from above, pass that into addAADT. This also gets a new CSV

- use the created csv from above again, run that into addDistToIntersect. This also gets a new csv

- Now, use created csv again, and run that into addRoadType. This will also return a new CSV

- Now just run it with addRoadDensityBetter

- Now, y'know the deal. Run it with addConstructionZone.

- Then, run it with addRoadCurvatureBetter. Note this has to be last; this is because it also returns a CSV of indices we may need to drop out, and if we then pass this to another file, that file may drop other rows which would interfere with the index mapping.
