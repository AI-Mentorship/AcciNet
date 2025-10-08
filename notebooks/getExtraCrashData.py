import osmnx as ox
import math
from shapely.geometry import Point
import time
import requests


def getAngle(coord1, coord2):
    ySide = coord2[1] - coord1[1]
    xSide = coord2[0] - coord1[0]
    if(xSide > 0):
        rawAngle = math.degrees(math.atan(ySide / xSide))
        if(rawAngle < 0):
            rawAngle += 360
        return rawAngle
    else:
        rawAngle = 180 + math.degrees(math.atan(ySide / xSide))
        return rawAngle


# COPILOT STOP WRITING MY CODE FOR ME, HOW DO I DIASBLE THIS FEATURE IT'S TOO PEAK, IT AUTOMATICALLY WROTE THIS
# FUNCTION FOR ME
def getThreePoints(coords, bestIndex):
    if(bestIndex == 0):
        return (coords[bestIndex], coords[bestIndex+1], coords[bestIndex+2])
    elif(bestIndex == len(coords)-2):
        return (coords[bestIndex-2], coords[bestIndex-1], coords[bestIndex])
    else:
        return (coords[bestIndex-1], coords[bestIndex], coords[bestIndex+1])
    
def getExtraData(latitude, longitude):
    point = (latitude, longitude)

    projectedPoint, _ = ox.projection.project_geometry(Point(point[1], point[0]))

    G = None

    while(True):
        try:
            G = ox.graph_from_point(point, dist=300, network_type="drive")
            if len(G.edges) == 0:
                return (-1, -1)
            break
        except ValueError:
            return (-1, -1)
        except (requests.exceptions.ConnectionError,
                    requests.exceptions.Timeout,
                    requests.exceptions.HTTPError,
                    OSError):
            time.sleep(60)

    u, v, k = ox.distance.nearest_edges(G, X=point[1], Y=point[0])
    edge = G.edges[u, v, k]

    lanes = edge.get("lanes")

    if(isinstance(lanes, list)):
        lanes = int(lanes[0]) + int(lanes[1])

    geom = edge.get("geometry")
    
    if geom is None:
        return (-1, -1)

    # first, get the closest segment
    geom_m, _ = ox.projection.project_geometry(geom)
    coords = list(geom_m.coords)

    if(len(coords) < 3):
        raise Exception("Not enough points in geometry to calculate curvature")
    bestIndex = 0
    smallestDist = float("inf")
    for i in range(len(coords)-1):
        current = coords[i]
        currentDist = ((current[0]-projectedPoint.x)**2 + (current[1]-projectedPoint.y)**2)**0.5
        if(currentDist < smallestDist):
            bestIndex = i
            smallestDist = currentDist

    (coord1, coord2, coord3) = getThreePoints(coords, bestIndex)

    angle1 = getAngle(coord1, coord2)
    angle2 = getAngle(coord2, coord3)

    finalCurve = max(angle1, angle2) - min(angle1, angle2)
    if(finalCurve > 180):
        finalCurve = min(angle1, angle2) + 360 - max(angle1, angle2)

    return (finalCurve, lanes)