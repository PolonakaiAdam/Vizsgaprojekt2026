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

// Reszponzív segédfüggvények – max szélességgel korlátozva desktopra
const wp = (percentage) => {
  const val = (width * percentage) / 100;
  return Math.min(val, percentage * 8); // max ~800px széles tartalom (100% = 800px)
};
const hp = (percentage) => (height * percentage) / 100;
const fs = (size) => {
  const base = width / 375;
  const scaled = size * base;
  return width > 768 ? Math.min(scaled, size * 1.2) : scaled; // tablet/desktop ne legyen túl nagy a szöveg
};

export default function App() {
  const { width: screenWidth } = useWindowDimensions();
  const isWideScreen = screenWidth > 768; // tablet vagy desktop

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

  // ... (minden fetch, handleLogin, handleRegister, handleLogout, pickImage, getLocation, submitReport, updateStatus függvény ugyanaz marad, mint az előző verzióban)

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
        fetchReports();
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
        fetchReports();
        setStatusModalVisible(false);
        setSelectedReport(null);
      } else {
        Alert.alert("Hiba", data.message || "Nem sikerült frissíteni.");
      }
    } catch (e) {
      Alert.alert("Hiba", "Szerver hiba történt.");
    }
  };

  const getMarkerIcon = (status) => {
    const color = (statusColors[status || "Új"] || "#FF0000").slice(1);
    return `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color.toLowerCase()}.png`;
  };

  const renderMapHTML = () => {
    const markers = reports
      .map((r) => {
        const desc = r.description?.replace(/"/g, '\\"') || "Nincs leírás";
        const img = r.image_path
          ? `<img src="${API_URL}${r.image_path}" style="max-width:100%;border-radius:8px;margin-top:8px;">`
          : "";
        const iconUrl = getMarkerIcon(r.status);
        return `
          var icon = L.icon({iconUrl: '${iconUrl}', shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png', iconSize: [25,41], iconAnchor: [12,41]});
          L.marker([${r.latitude},${r.longitude}], {icon: icon}).addTo(map)
           .bindPopup("<b>${desc}</b><br>Státusz: <b>${
          r.status || "Új"
        }</b><br>${img}");
        `;
      })
      .join("\n");

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
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            ${markers}
            setTimeout(() => map.invalidateSize(), 500);
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

      {/* FŐ TARTALOM – központosítva wide screen-en */}
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
                      backgroundColor: statusColors[s] || "#666",
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
            {Platform.OS === "web" ? (
              <iframe
                srcDoc={renderMapHTML()}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="CityGuard Térkép"
              />
            ) : (
              <WebView source={{ html: renderMapHTML() }} style={{ flex: 1 }} />
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
  container: { flex: 1, backgroundColor: "#F5F7FA" },
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
    color: "#2E7D32",
  },
  input: {
    backgroundColor: "#fff",
    padding: wp(4),
    borderRadius: 12,
    marginVertical: hp(1),
    borderWidth: 1,
    borderColor: "#DDD",
    fontSize: fs(16),
  },
  multilineInput: {
    backgroundColor: "#fff",
    padding: wp(4),
    borderRadius: 12,
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: "#DDD",
    fontSize: fs(16),
    minHeight: hp(15),
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: "#2E7D32",
    padding: wp(4),
    borderRadius: 12,
    alignItems: "center",
    marginVertical: hp(2),
  },
  secondaryButton: {
    backgroundColor: "#4A90E2",
    padding: wp(4),
    borderRadius: 12,
    alignItems: "center",
    marginVertical: hp(1),
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: fs(16) },
  linkText: {
    textAlign: "center",
    marginTop: hp(3),
    color: "#2E7D32",
    fontWeight: "bold",
    fontSize: fs(15),
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2E7D32",
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
    backgroundColor: "#D32F2F",
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: 20,
    marginRight: wp(3),
  },
  adminBadgeText: { color: "#fff", fontWeight: "bold", fontSize: fs(12) },
  logoutButton: {
    backgroundColor: "#D32F2F",
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.5),
    borderRadius: 12,
  },
  logoutButtonText: { color: "#fff", fontWeight: "bold", fontSize: fs(15) },
  contentContainer: { flex: 1, padding: wp(5) },
  previewImage: {
    width: "100%",
    height: hp(30),
    borderRadius: 12,
    marginVertical: hp(2),
  },
  successText: {
    marginVertical: hp(2),
    color: "#4CAF50",
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
    backgroundColor: "#777",
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
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: { fontSize: fs(17), fontWeight: "bold", color: "#333" },
  cardStatus: { fontSize: fs(15), fontWeight: "bold", marginTop: hp(0.5) },
  cardImage: {
    width: "100%",
    height: hp(25),
    borderRadius: 12,
    marginTop: hp(1.5),
  },
  adminHint: {
    fontSize: fs(12),
    color: "#0066cc",
    marginTop: hp(1),
    fontStyle: "italic",
    textAlign: "right",
  },
  emptyText: {
    textAlign: "center",
    padding: hp(5),
    color: "#666",
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
    color: "#333",
  },
  modalDesc: {
    fontSize: fs(15),
    color: "#555",
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
  cancelText: { color: "#666", fontWeight: "bold", fontSize: fs(16) },
});
