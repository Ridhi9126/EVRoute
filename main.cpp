#include <iostream>
#include <fstream>
#include <map>
#include "graph.h"
#include "dijkstra.h"
#include "ev_logic.h"

using namespace std;

map<int, string> nodeNames;

// Load nodes
void loadNodes() {
    ifstream file("data/nodes.txt");
    int id;
    string name;

    while(file >> id >> name) {
        nodeNames[id] = name;
    }
}

// Load edges
void loadEdges(Graph &g) {
    ifstream file("data/edges.txt");
    int u, v, dist;

    while(file >> u >> v >> dist) {
        g.addEdge(u, v, dist);
    }
}

// Load charging stations
void loadStations() {
    ifstream file("data/stations.txt");
    int x;

    while(file >> x) {
        chargingStations.insert(x);
    }
}

int main() {

    loadNodes();

    Graph g(nodeNames.size());

    loadEdges(g);
    loadStations();

    int source, destination, battery;

    cout << "Available Locations:\n";
    for(auto &p : nodeNames) {
        cout << p.first << " -> " << p.second << endl;
    }

    cout << "\nEnter source ID: ";
    cin >> source;

    cout << "Enter destination ID: ";
    cin >> destination;

    cout << "Enter battery (km): ";
    cin >> battery;

    vector<int> dist = dijkstra(g, source);

    cout << "\n---- RESULT ----\n";

    if(dist[destination] == INT_MAX) {
        cout << "No path exists!\n";
        return 0;
    }

    cout << "Distance required: " << dist[destination] << " km\n";

    if(canTravel(dist[destination], battery)) {
        cout << "Direct travel possible from "
             << nodeNames[source] << " to "
             << nodeNames[destination] << endl;
    } else {
        int station = findNearestStation(dist);

        if(station == -1) {
            cout << "No charging station available!\n";
        } else {
            cout << "Battery low!\n";
            cout << "Go via charging station: "
                 << nodeNames[station] << endl;
        }
    }

    return 0;
}