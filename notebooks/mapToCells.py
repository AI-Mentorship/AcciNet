from concurrent.futures import ThreadPoolExecutor, as_completed
from getExtraCrashData import getExtraData
import pandas as pd

def processCrash(crash, final_cells, numWithoutData, lock, i, crashes):
    (angle, lanes) = getExtraData(crash["Latitude"], crash["Longitude"])
    if angle != -1 and lanes != -1:
        crash["road_curvature"] = angle
        crash["number_of_lanes"] = lanes
    else:
        with lock:
            numWithoutData.value += 1
    crashIndex = crash["Hour of Day"]
    # loop through each possible timeslot represneted by j, and put into the cells the value with the correct label based on if the time matches.
    for j in range(24):
        crashToAppend = crash.copy()
        crashToAppend["Hour of Day"] = j

        rolling_7_count = 0
        rolling_30_count = 0
        currentCrashDate = crash["Crash Date"]
        # loop through previous crashes
        for z in range(i - 1, -1, -1):
            prevCrashDate = crashes.iloc[z]["Crash Date"]
            daysPassed = (currentCrashDate - prevCrashDate).days
            # use this if sattement to add it
            if(daysPassed == 0):
                prevHour = crashes.iloc[z]["Hour of Day"]
                if(prevHour < j):
                    rolling_7_count += 1
                    rolling_30_count += 1
            if(daysPassed > 30):
                break
            # note that we don't use an else statement. This way if both are true, it'll be added to both
            if(daysPassed <= 7):
                rolling_7_count += 1
            if(daysPassed <= 30):
                rolling_30_count += 1
        # now, add it to the count
        crashToAppend["crash_count_7d"] = rolling_7_count
        crashToAppend["crash_count_30d"] = rolling_30_count

        crashToAppend["Hour of Day"] = j

        rolling_7_count = 0
        rolling_30_count = 0
        currentCrashDate = crash["Crash Date"]
        # loop through previous crashes
        for z in range(i - 1, -1, -1):
            prevCrashDate = crashes.iloc[z]["Crash Date"]
            daysPassed = (currentCrashDate - prevCrashDate).days
            # use this if sattement to add it
            if(daysPassed == 0):
                prevHour = crashes.iloc[z]["Hour of Day"]
                if(prevHour < j):
                    rolling_7_count += 1
                    rolling_30_count += 1
            if(daysPassed > 30):
                break
            # note that we don't use an else statement. This way if both are true, it'll be added to both
            if(daysPassed <= 7):
                rolling_7_count += 1
            if(daysPassed <= 30):
                rolling_30_count += 1
        # now, add it to the count
        crashToAppend["crash_count_7d"] = rolling_7_count
        crashToAppend["crash_count_30d"] = rolling_30_count

        # check if the timeslot matches. If so, put crash with label of 1, otherwise keep it as the 0
        if(crashIndex == j):
            crashToAppend["label"] = 1
        with lock:
            final_cells.append(crashToAppend)

def processCell(crashes, final_cells, numWithoutData, lock):
    cellIndex = crashes.iloc[0]["index_right"]
    crashes.drop(columns=["index_right", "Crash ID", "geometry"], inplace=True)

    crashes["crash_count_7d"] = 0
    crashes["crash_count_30d"] = 0
    crashes["road_curvature"] = 0
    crashes["number_of_lanes"] = 0
    crashes["label"] = 0

    crashes["Crash Date"] = pd.to_datetime(crashes["Crash Date"], format="%Y-%m-%d")
    crashes = crashes.sort_values(["Crash Date", "Hour of Day"], ascending=True).reset_index(drop=True)

    # loop through each crash to add it to each timeslot
    with ThreadPoolExecutor(max_workers=crashes.shape[0]) as executor:
        # group by when they go to similar cells
        futures = [executor.submit(processCrash, crash, final_cells, numWithoutData, lock, i, crashes) for i, crash in crashes.iterrows()]

        for future in as_completed(futures):
            try:
                result = future.result()  # will raise exception if the process failed
            except Exception as e:
                raise Exception("One of the crashes failed, idk why")
    return f'In cell {cellIndex} we have {len(crashes)} crashes! New count also is {numWithoutData}'