#include <iostream>
#include <vector>
#include <cmath>
#include <algorithm>
using namespace std;

struct Station {
    double lat, lon;
};

double getDistance(double lat1, double lon1, double lat2, double lon2) {
    double R = 6371;
    double dLat = (lat2 - lat1) * M_PI / 180;
    double dLon = (lon2 - lon1) * M_PI / 180;

    double a = sin(dLat/2)*sin(dLat/2) +
               cos(lat1*M_PI/180)*cos(lat2*M_PI/180) *
               sin(dLon/2)*sin(dLon/2);

    return R * 2 * atan2(sqrt(a), sqrt(1-a));
}

int main() {

    int n;
    cin >> n;

    vector<Station> stations(n);

    for (int i = 0; i < n; i++)
        cin >> stations[i].lat >> stations[i].lon;

    double userLat, userLon, battery;
    cin >> userLat >> userLon >> battery;

    double maxRange = (battery * 400) / 100;

    vector<pair<double,int>> valid;

    for (int i = 0; i < n; i++) {
        double d = getDistance(userLat, userLon, stations[i].lat, stations[i].lon);

        if (d <= maxRange) {
            valid.push_back({d, i});
        }
    }

    sort(valid.begin(), valid.end());

    int limit = min(3, (int)valid.size());

    cout << limit << "\n";

    for (int i = 0; i < limit; i++) {
        cout << valid[i].second << " " << valid[i].first << "\n";
    }

    return 0;
}