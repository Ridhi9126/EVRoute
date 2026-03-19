#include "dijkstra.h"
#include <queue>
#include <climits>

using namespace std;

vector<int> dijkstra(Graph &g, int src) {
    vector<int> dist(g.V, INT_MAX);

    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq;

    dist[src] = 0;
    pq.push({0, src});

    while(!pq.empty()) {
        int d = pq.top().first;
        int u = pq.top().second;
        pq.pop();

        for(auto edge : g.adj[u]) {
            int v = edge.to;
            int weight = edge.distance;

            if(dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                pq.push({dist[v], v});
            }
        }
    }

    return dist;
}