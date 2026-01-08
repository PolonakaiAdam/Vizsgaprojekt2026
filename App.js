import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";
import { useWindowDimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// Reszponzív segédfüggvények
const wp = (percentage) => {
  const val = (width * percentage) / 100;
  return Math.min(val, percentage * 8); // max ~800px
};
const hp = (percentage) => (height * percentage) / 100;
const fs = (size) => {
  const base = width / 375;
  const scaled = size * base;
  return width > 768 ? Math.min(scaled, size * 1.2) : scaled;
};

export default function App() {
  const { width: screenWidth } = useWindowDimensions();
  const isWideScreen = screenWidth > 768;

  const [screen, setScreen] = useState("login");
  const [isRegister, setIsRegister] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState("Összes");

  // ÚJ: Kulcs a térkép újratöltéséhez
  const [mapReloadKey, setMapReloadKey] = useState(0);

  const API_URL = "http://192.168.56.1/cityguard-api/"; // <<< SAJÁT IP!!!

  const statusOptions = ["Új", "Folyamatban", "Megoldva", "Elutasítva"];
  const statusColors = {
    Új: "#FF5722",
    Folyamatban: "#2196F3",
    Megoldva: "#4CAF50",
    Elutasítva: "#F44336",
  };

  useEffect(() => {
    if (currentUser) {
      fetchReports();
    }
  }, [currentUser]);

  const fetchReports = async () => {
    try {
      const res = await fetch(API_URL + "get_reports.php");
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      } else {
        setReports([]);
        console.log("Hibás válasz a get_reports.php-ból:", data);
      }
    } catch (e) {
      console.error("Hiba a fetchReports-ban:", e);
      Alert.alert("Hiba", "Nem sikerült betölteni a jelentéseket.");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert("Hiányzik", "Email és jelszó kötelező!");
    }
    try {
      const res = await fetch(API_URL + "login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setScreen("bejelentés");
        Alert.alert(
          "Siker",
          `Üdv, ${data.user.name}!${
            data.user.is_admin ? " 👑 Admin módban vagy!" : ""
          }`
        );
      } else {
        Alert.alert("Hiba", data.message || "Hibás adatok!");
      }
    } catch (e) {
      Alert.alert("Hiba", "Nem sikerült csatlakozni a szerverhez.");
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      return Alert.alert("Hiányzik", "Minden mező kötelező!");
    }
    try {
      const res = await fetch(API_URL + "register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      Alert.alert(data.success ? "Siker" : "Hiba", data.message);
      if (data.success) {
        setIsRegister(false);
      }
    } catch (e) {
      Alert.alert("Hiba", "Nem sikerült regisztrálni.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Kijelentkezés", "Biztosan ki akarsz jelentkezni?", [
      { text: "Mégse", style: "cancel" },
      {
        text: "Kilépés",
        style: "destructive",
        onPress: () => {
          setCurrentUser(null);
          setScreen("login");
          setName("");
          setEmail("");
          setPassword("");
          setDesc("");
          setImage(null);
          setLocation(null);
          setReports([]);
          setSelectedReport(null);
          setFilterStatus("Összes");
          setStatusModalVisible(false);
          setMapReloadKey(0);
          Alert.alert("Siker", "Sikeresen kijelentkeztél!");
        },
      },
    ]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6,
      base64: true,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Hiba", "GPS engedély szükséges!");
    }
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);
  };

  const submitReport = async () => {
    if (!desc || !location) {
      return Alert.alert("Hiányzik", "Leírás és hely kötelező!");
    }

    try {
      const res = await fetch(API_URL + "submit_report.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser.id,
          description: desc,
          image: image,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert("Siker", data.message);
        setDesc("");
        setImage(null);
        setLocation(null);

        // FONTOS: várjuk meg az új adatok betöltését
        await fetchReports();

        // KÉNYSZERÍTJÜK A TÉRKÉP ÚJRAÉPÍTÉSÉT
        setMapReloadKey((prev) => prev + 1);

        setScreen("lista");
      } else {
        Alert.alert("Hiba", data.message);
      }
    } catch (e) {
      Alert.alert("Hiba", "Nem sikerült elküldeni.");
    }
  };

  const updateStatus = async (id, newStatus) => {
    if (!currentUser?.is_admin) {
      Alert.alert("Hozzáférés megtagadva", "Csak admin módosíthat státuszt!");
      return;
    }

    try {
      const res = await fetch(API_URL + "update_status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser.id,
          report_id: id,
          new_status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Siker", "Státusz frissítve!");
        await fetchReports(); // frissítjük a listát és térképet

        // KÉNYSZERÍTJÜK A TÉRKÉP ÚJRAÉPÍTÉSÉT
        setMapReloadKey((prev) => prev + 1);

        setStatusModalVisible(false);
        setSelectedReport(null);
      } else {
        Alert.alert("Hiba", data.message || "Nem sikerült frissíteni.");
      }
    } catch (e) {
      Alert.alert("Hiba", "Szerver hiba történt.");
    }
  };

  // Marker ikonok
  const getMarkerIcon = (status) => {
    let color = "red"; // Új
    if (status === "Folyamatban") color = "blue";
    if (status === "Megoldva") color = "green";
    if (status === "Elutasítva") color = "grey";

    return `https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-${color}.png`;
  };

  const renderMapHTML = () => {
    // Csak érvényes koordinátájú reportok
    const validReports = reports.filter(
      (r) =>
        r.latitude &&
        r.longitude &&
        !isNaN(parseFloat(r.latitude)) &&
        !isNaN(parseFloat(r.longitude))
    );

    let markersScript = "";
    let boundsScript = "";

    if (validReports.length > 0) {
      // Vannak érvényes markerek
      markersScript = validReports
        .map((r) => {
          const desc = (r.description || "Nincs leírás").replace(/"/g, '\\"');
          const img = r.image_path
            ? `<img src="${API_URL}${r.image_path}" style="max-width:100%;border-radius:8px;margin-top:8px;">`
            : "";
          const iconUrl = getMarkerIcon(r.status);

          return `
          L.marker([${parseFloat(r.latitude)}, ${parseFloat(r.longitude)}], {
            icon: L.icon({
              iconUrl: '${iconUrl}',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })
          })
          .addTo(map)
          .bindPopup("<b>${desc}</b><br>Státusz: <b>${
            r.status || "Új"
          }</b><br>${img}");
        `;
        })
        .join("\n");

      // Automatikus zoom a markerekre
      boundsScript = `
      var group = new L.featureGroup([${validReports
        .map(
          (r) =>
            `L.marker([${parseFloat(r.latitude)}, ${parseFloat(r.longitude)}])`
        )
        .join(",")}]);
      map.fitBounds(group.getBounds().pad(0.3));
    `;
    } else {
      // Nincs érvényes marker (vagy nincs report, vagy nincs érvényes koordináta)
      markersScript = `
      L.marker([47.4979, 19.0402]).addTo(map)
       .bindPopup("<b>${
         reports.length === 0
           ? "Még nincsenek bejelentések"
           : "Nincs megjeleníthető bejelentés érvényes hellyel"
       }</b>")
       .openPopup();
    `;
    }

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html,body,#map{height:100%;margin:0;padding:0;overflow:hidden;}
          .leaflet-popup-content { max-height: 60vh; overflow-y: auto; }
          .leaflet-popup-content img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var map = L.map('map', {zoomControl: true}).setView([47.4979, 19.0402], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          ${markersScript}

          ${boundsScript}

          // FORCE RESIZE - FONTOS!
          window.onload = function() {
            setTimeout(function() {
              map.invalidateSize(true);
              map.setView(map.getCenter(), map.getZoom());
            }, 100);
            
            // Extra resize, ha kell
            setTimeout(function() {
              map.invalidateSize(true);
            }, 500);
          };
          
          // Window resize eseménykezelő is
          window.addEventListener('resize', function() {
            setTimeout(function() {
              map.invalidateSize(true);
            }, 300);
          });
        </script>
      </body>
    </html>
  `;
  };

  const filteredReports =
    filterStatus === "Összes"
      ? reports
      : reports.filter((r) => r.status === filterStatus);

  if (screen === "login") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Text style={styles.title}>
            {isRegister ? "Regisztráció" : "Bejelentkezés"}
          </Text>

          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Név"
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Jelszó"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={isRegister ? handleRegister : handleLogin}
          >
            <Text style={styles.buttonText}>
              {isRegister ? "Regisztráció" : "Bejelentkezés"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
            <Text style={styles.linkText}>
              {isRegister
                ? "Már van fiókod? Bejelentkezés"
                : "Nincs fiókod? Regisztrálj"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* NAVBAR */}
      <View style={styles.navbar}>
        <View style={styles.navButtonsContainer}>
          {["Bejelentés", "Lista", "Térkép"].map((label) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.navButton,
                screen === label.toLowerCase() && styles.navButtonActive,
              ]}
              onPress={() => setScreen(label.toLowerCase())}
            >
              <Text style={styles.navButtonText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {currentUser?.is_admin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Kilépés</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FŐ TARTALOM */}
      <View style={isWideScreen ? styles.wideContentWrapper : { flex: 1 }}>
        {/* BEJELENTÉS */}
        {screen === "bejelentés" && (
          <View style={styles.contentContainer}>
            <TextInput
              style={styles.multilineInput}
              placeholder="Probléma részletes leírása..."
              value={desc}
              onChangeText={setDesc}
              multiline
            />
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={pickImage}
            >
              <Text style={styles.buttonText}>Kép kiválasztása</Text>
            </TouchableOpacity>
            {image && (
              <Image
                source={{ uri: image }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={getLocation}
            >
              <Text style={styles.buttonText}>Hely meghatározása (GPS)</Text>
            </TouchableOpacity>
            {location && (
              <Text style={styles.successText}>✔ Hely sikeresen rögzítve</Text>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={submitReport}
            >
              <Text style={styles.buttonText}>Bejelentés elküldése</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LISTA */}
        {screen === "lista" && (
          <View style={{ flex: 1 }}>
            <View style={styles.filterContainer}>
              {["Összes", ...statusOptions].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.filterButton,
                    filterStatus === s && {
                      backgroundColor: statusColors[s] || "#90AB8B",
                    },
                  ]}
                  onPress={() => setFilterStatus(s)}
                >
                  <Text style={styles.filterText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={filteredReports}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ padding: wp(3) }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.card}
                  onLongPress={() => {
                    if (currentUser?.is_admin) {
                      setSelectedReport(item);
                      setStatusModalVisible(true);
                    } else {
                      Alert.alert(
                        "Információ",
                        "Csak admin módosíthat státuszt!"
                      );
                    }
                  }}
                >
                  <Text style={styles.cardTitle}>
                    {item.description || "Nincs leírás"}
                  </Text>
                  <Text
                    style={[
                      styles.cardStatus,
                      { color: statusColors[item.status || "Új"] },
                    ]}
                  >
                    Státusz: {item.status || "Új"}
                  </Text>
                  {item.image_path && (
                    <Image
                      source={{ uri: `${API_URL}${item.image_path}` }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  )}
                  {currentUser?.is_admin && (
                    <Text style={styles.adminHint}>
                      Hosszú nyomás a státusz változtatáshoz
                    </Text>
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Nincs megjeleníthető bejelentés.
                </Text>
              }
            />
          </View>
        )}

        {/* TÉRKÉP */}
        {screen === "térkép" && (
          <View style={{ flex: 1 }}>
            {/* Frissítés gomb (opcionális, debug célokra) */}
            {__DEV__ && (
              <View style={styles.mapHeader}>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => setMapReloadKey((prev) => prev + 1)}
                >
                  <Text style={styles.refreshButtonText}>
                    🔄 Térkép frissítése
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* MINDIG MEGJELENÍTJÜK A TÉRKÉPET! */}
            {Platform.OS === "web" ? (
              <iframe
                srcDoc={renderMapHTML()}
                style={{
                  width: "100%",
                  height: __DEV__ ? "90%" : "100%",
                  border: "none",
                }}
                title="CityGuard Térkép"
                key={`iframe-${mapReloadKey}`} // Újratöltés kényszerítése
              />
            ) : (
              <WebView
                key={`webview-${mapReloadKey}`} // Mindig más key, így új komponens lesz
                source={{ html: renderMapHTML() }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={["*"]}
                allowUniversalAccessFromFileURLs={true}
                mixedContentMode="compatibility"
                onLoad={() =>
                  console.log("Térkép betöltve, key:", mapReloadKey)
                }
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn("WebView error: ", nativeEvent);
                }}
              />
            )}
          </View>
        )}
      </View>

      {/* STÁTUSZ MODAL */}
      <Modal visible={statusModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { width: isWideScreen ? wp(60) : wp(90) },
            ]}
          >
            <Text style={styles.modalTitle}>Státusz módosítása</Text>
            <Text style={styles.modalDesc}>
              {selectedReport?.description?.substring(0, 150) || "Nincs leírás"}
              ...
            </Text>
            {statusOptions.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusOption,
                  { backgroundColor: statusColors[s] },
                ]}
                onPress={() => updateStatus(selectedReport?.id, s)}
              >
                <Text style={styles.statusOptionText}>{s}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => {
                setStatusModalVisible(false);
                setSelectedReport(null);
              }}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Mégse</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EBF4DD" },
  wideContentWrapper: {
    flex: 1,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  authContainer: { flex: 1, justifyContent: "center", padding: wp(8) },
  title: {
    fontSize: fs(32),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: hp(5),
    color: "#5A7863",
  },
  input: {
    backgroundColor: "#fff",
    padding: wp(4),
    borderRadius: 12,
    marginVertical: hp(1),
    borderWidth: 1,
    borderColor: "#90AB8B",
    fontSize: fs(16),
  },
  multilineInput: {
    backgroundColor: "#fff",
    padding: wp(4),
    borderRadius: 12,
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: "#90AB8B",
    fontSize: fs(16),
    minHeight: hp(15),
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: "#5A7863",
    padding: wp(4),
    borderRadius: 12,
    alignItems: "center",
    marginVertical: hp(2),
  },
  secondaryButton: {
    backgroundColor: "#90AB8B",
    padding: wp(4),
    borderRadius: 12,
    alignItems: "center",
    marginVertical: hp(1),
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: fs(16) },
  linkText: {
    textAlign: "center",
    marginTop: hp(3),
    color: "#5A7863",
    fontWeight: "bold",
    fontSize: fs(15),
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#5A7863",
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  navButtonsContainer: { flexDirection: "row", flexWrap: "wrap" },
  navButton: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.2),
    borderRadius: 8,
    marginRight: wp(2),
  },
  navButtonActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  navButtonText: { color: "#fff", fontWeight: "bold", fontSize: fs(15) },
  adminBadge: {
    backgroundColor: "#3B4953",
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: 20,
    marginRight: wp(3),
  },
  adminBadgeText: { color: "#EBF4DD", fontWeight: "bold", fontSize: fs(12) },
  logoutButton: {
    backgroundColor: "#3B4953",
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
    borderRadius: 12,
  },
  logoutButtonText: { color: "#EBF4DD", fontWeight: "bold", fontSize: fs(15) },
  contentContainer: { flex: 1, padding: wp(5) },
  previewImage: {
    width: "100%",
    height: hp(30),
    borderRadius: 12,
    marginVertical: hp(2),
  },
  successText: {
    marginVertical: hp(2),
    color: "#5A7863",
    fontSize: fs(16),
    textAlign: "center",
  },
  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    padding: wp(3),
    backgroundColor: "#fff",
  },
  filterButton: {
    backgroundColor: "#90AB8B",
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: 30,
    margin: wp(1.5),
  },
  filterText: { color: "#fff", fontWeight: "bold", fontSize: fs(13) },
  card: {
    padding: wp(4),
    backgroundColor: "#fff",
    borderRadius: 16,
    marginVertical: hp(1),
    elevation: 6,
    shadowColor: "#3B4953",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardTitle: { fontSize: fs(17), fontWeight: "bold", color: "#3B4953" },
  cardStatus: { fontSize: fs(15), fontWeight: "bold", marginTop: hp(0.5) },
  cardImage: {
    width: "100%",
    height: hp(25),
    borderRadius: 12,
    marginTop: hp(1.5),
  },
  adminHint: {
    fontSize: fs(12),
    color: "#5A7863",
    marginTop: hp(1),
    fontStyle: "italic",
    textAlign: "right",
  },
  emptyText: {
    textAlign: "center",
    padding: hp(5),
    color: "#5A7863",
    fontSize: fs(16),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: wp(6),
    borderRadius: 20,
    alignItems: "center",
    maxHeight: hp(80),
  },
  modalTitle: {
    fontSize: fs(22),
    fontWeight: "bold",
    marginBottom: hp(2),
    color: "#3B4953",
  },
  modalDesc: {
    fontSize: fs(15),
    color: "#5A7863",
    marginVertical: hp(2),
    textAlign: "center",
  },
  statusOption: {
    padding: wp(4),
    borderRadius: 12,
    marginVertical: hp(1),
    width: "100%",
    alignItems: "center",
  },
  statusOptionText: { color: "#fff", fontWeight: "bold", fontSize: fs(16) },
  cancelButton: { marginTop: hp(3) },
  cancelText: { color: "#3B4953", fontWeight: "bold", fontSize: fs(16) },
  // Új stílusok a térképhez
  mapHeader: {
    padding: 10,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  refreshButton: {
    backgroundColor: "#5A7863",
    padding: 10,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  refreshButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
