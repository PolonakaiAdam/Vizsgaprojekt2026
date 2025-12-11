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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { WebView } from "react-native-webview";

export default function App() {
  const [screen, setScreen] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState(null);

  const [desc, setDesc] = useState("");
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [reports, setReports] = useState([]);

  const API_URL = "http://192.168.56.1/cityguard-api/";

  // ----------------- AUTH -----------------
  const registerUser = async () => {
    if (!email || !password) return alert("Tölts ki minden mezőt!");
    try {
      const res = await fetch(API_URL + "register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) setScreen("login");
    } catch (e) {
      alert(e.message);
    }
  };

  const loginUser = async () => {
    if (!email || !password) return alert("Tölts ki minden mezőt!");
    try {
      const res = await fetch(API_URL + "login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setScreen("home");
        setUserId(data.user_id);
        fetchReports();
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // ----------------- REPORT -----------------
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5 });
    if (!result.canceled) setImage(result.assets[0].uri);
  };
  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    }
  };

  const submitReport = async () => {
    if (!desc || !location) return alert("Tölts ki minden mezőt!");
    try {
      const res = await fetch(API_URL + "submit_report.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          description: desc,
          image,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });
      const data = await res.json();
      alert(data.message);
      if (data.success) {
        setDesc("");
        setImage(null);
        setLocation(null);
        fetchReports();
        setScreen("list");
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(API_URL + "get_reports.php");
      const data = await res.json();
      setReports(data);
    } catch (e) {
      alert(e.message);
    }
  };

  const renderMapHTML = () => {
    const markers = reports
      .map(
        (r) =>
          `L.marker([${r.latitude},${r.longitude}]).addTo(map).bindPopup("<b>${r.description}</b><br>${r.status}");`
      )
      .join("");
    return `<html><head><meta name="viewport" content="initial-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" /><script src="https://unpkg.com/leaflet/dist/leaflet.js"></script></head><body><div id="map" style="width:100%; height:100%;"></div><script>var map=L.map('map').setView([47.4979,19.0402],13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);${markers}</script></body></html>`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* LOGIN */}
      {screen === "login" && (
        <View style={styles.loginContainer}>
          <Image source={require("./assets/logo.png")} style={styles.logo} />
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
          <TouchableOpacity style={styles.button} onPress={loginUser}>
            <Text style={styles.buttonText}>Bejelentkezés</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen("register")}>
            <Text style={{ color: "#4A90E2", marginTop: 10 }}>
              Nincs fiókod? Regisztráció
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* REGISTER */}
      {screen === "register" && (
        <View style={styles.loginContainer}>
          <Image source={require("./assets/logo.png")} style={styles.logo} />
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
          <TouchableOpacity style={styles.button} onPress={registerUser}>
            <Text style={styles.buttonText}>Regisztráció</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen("login")}>
            <Text style={{ color: "#4A90E2", marginTop: 10 }}>
              Már van fiókod? Bejelentkezés
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* HOME */}
      {screen === "home" && (
        <View style={{ flex: 1 }}>
          <View style={styles.navbar}>
            {["Bejelentés", "Lista", "Térkép"].map((label) => (
              <TouchableOpacity
                key={label}
                style={styles.navButton}
                onPress={() => setScreen(label.toLowerCase())}
              >
                <Text style={styles.navButtonText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {screen === "home" && (
            <View style={styles.center}>
              <Text style={styles.title}>Üdv a CityŐr alkalmazásban!</Text>
            </View>
          )}
        </View>
      )}

      {/* REPORT */}
      {screen === "bejelentés" && (
        <View style={{ flex: 1, padding: 10 }}>
          <TextInput
            style={styles.input}
            placeholder="Probléma leírása"
            value={desc}
            onChangeText={setDesc}
          />
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>Kép feltöltése</Text>
          </TouchableOpacity>
          {image && (
            <Image
              source={{ uri: image }}
              style={{
                width: "100%",
                height: 150,
                borderRadius: 10,
                marginVertical: 10,
              }}
            />
          )}
          <TouchableOpacity style={styles.button} onPress={getLocation}>
            <Text style={styles.buttonText}>GPS hely meghatározása</Text>
          </TouchableOpacity>
          {location && (
            <Text style={{ marginVertical: 5 }}>Hely rögzítve ✔️</Text>
          )}
          <TouchableOpacity style={styles.button} onPress={submitReport}>
            <Text style={styles.buttonText}>Bejelentés küldése</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LIST */}
      {screen === "lista" && (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={{ fontWeight: "bold" }}>{item.description}</Text>
              <Text>Status: {item.status}</Text>
            </View>
          )}
        />
      )}

      {/* MAP */}
      {screen === "térkép" && (
        <WebView source={{ html: renderMapHTML() }} style={{ flex: 1 }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6F2EA",
    padding: 10,
  },

  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    width: "90%",
    marginVertical: 10,
    backgroundColor: "#fff",
  },

  button: {
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },

  navbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
    backgroundColor: "#4A90E2",
    padding: 10,
  },

  navButton: {
    padding: 10,
    borderRadius: 5,
  },

  navButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },

  card: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginVertical: 5,
  },
});
