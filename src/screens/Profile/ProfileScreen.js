import React, { useMemo, useState } from "react";
import {
	Alert,
	Modal,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

const LOCATION_DATA = {
	India: {
		Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"],
		Maharashtra: ["Mumbai", "Pune", "Nagpur"],
		Delhi: ["New Delhi"],
	},
	USA: {
		California: ["San Francisco", "Los Angeles", "San Diego"],
		Texas: ["Austin", "Dallas", "Houston"],
		NewYork: ["New York City", "Buffalo"],
	},
	UAE: {
		Dubai: ["Dubai"],
		AbuDhabi: ["Abu Dhabi"],
		Sharjah: ["Sharjah"],
	},
};

function DropdownSelector({ label, value, onPress }) {
	return (
		<View style={styles.fieldBlock}>
			<Text style={styles.label}>{label}</Text>
			<TouchableOpacity style={styles.dropdown} onPress={onPress} activeOpacity={0.8}>
				<Text style={[styles.dropdownText, !value && styles.placeholderText]}>
					{value || `Select ${label}`}
				</Text>
			</TouchableOpacity>
		</View>
	);
}

function PickerModal({ visible, title, options, onSelect, onClose }) {
	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.modalBackdrop}>
				<View style={styles.modalCard}>
					<Text style={styles.modalTitle}>{title}</Text>
					<ScrollView style={styles.optionsContainer}>
						{options.map((option) => (
							<TouchableOpacity
								key={option}
								style={styles.optionRow}
								onPress={() => onSelect(option)}
							>
								<Text style={styles.optionText}>{option}</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<Text style={styles.closeButtonText}>Close</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

export default function ProfileScreen() {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [mobileNumber, setMobileNumber] = useState("");
	const [email, setEmail] = useState("");
	const [addressLine1, setAddressLine1] = useState("");
	const [addressLine2, setAddressLine2] = useState("");
	const [addressLine3, setAddressLine3] = useState("");
	const [country, setCountry] = useState("");
	const [stateName, setStateName] = useState("");
	const [city, setCity] = useState("");
	const [pinCode, setPinCode] = useState("");

	const [pickerType, setPickerType] = useState("");

	const countryOptions = useMemo(() => Object.keys(LOCATION_DATA), []);
	const stateOptions = useMemo(() => {
		if (!country) {
			return [];
		}
		return Object.keys(LOCATION_DATA[country]);
	}, [country]);
	const cityOptions = useMemo(() => {
		if (!country || !stateName) {
			return [];
		}
		return LOCATION_DATA[country][stateName];
	}, [country, stateName]);

	const pickerOptions =
		pickerType === "country"
			? countryOptions
			: pickerType === "state"
			? stateOptions
			: pickerType === "city"
			? cityOptions
			: [];

	const pickerTitle =
		pickerType === "country"
			? "Select Country"
			: pickerType === "state"
			? "Select State"
			: "Select City";

	const handleSelect = (selectedValue) => {
		if (pickerType === "country") {
			setCountry(selectedValue);
			setStateName("");
			setCity("");
		}

		if (pickerType === "state") {
			setStateName(selectedValue);
			setCity("");
		}

		if (pickerType === "city") {
			setCity(selectedValue);
		}

		setPickerType("");
	};

	const handleSaveProfile = () => {
		Alert.alert("Profile", "Profile details saved successfully.");
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
				<Text style={styles.pageTitle}>Profile</Text>

				<View style={styles.fieldBlock}>
					<Text style={styles.label}>Name (First Name - Last Name)</Text>
					<View style={styles.row}>
						<TextInput
							value={firstName}
							onChangeText={setFirstName}
							placeholder="First Name"
							style={[styles.input, styles.halfInput, styles.halfInputSpacing]}
						/>
						<TextInput
							value={lastName}
							onChangeText={setLastName}
							placeholder="Last Name"
							style={[styles.input, styles.halfInput]}
						/>
					</View>
				</View>

				<View style={styles.fieldBlock}>
					<Text style={styles.label}>Mobile Number</Text>
					<TextInput
						value={mobileNumber}
						onChangeText={setMobileNumber}
						placeholder="Enter Mobile Number"
						keyboardType="phone-pad"
						style={styles.input}
					/>
				</View>

				<View style={styles.fieldBlock}>
					<Text style={styles.label}>E-mail</Text>
					<TextInput
						value={email}
						onChangeText={setEmail}
						placeholder="Enter E-mail"
						autoCapitalize="none"
						keyboardType="email-address"
						style={styles.input}
					/>
				</View>

				<Text style={styles.sectionTitle}>Address</Text>

				<View style={styles.fieldBlock}>
					<Text style={styles.label}>First Line</Text>
					<TextInput
						value={addressLine1}
						onChangeText={setAddressLine1}
						placeholder="Address Line 1"
						style={styles.input}
					/>
				</View>

				<View style={styles.fieldBlock}>
					<Text style={styles.label}>Second Line</Text>
					<TextInput
						value={addressLine2}
						onChangeText={setAddressLine2}
						placeholder="Address Line 2"
						style={styles.input}
					/>
				</View>

				<View style={styles.fieldBlock}>
					<Text style={styles.label}>Third Line</Text>
					<TextInput
						value={addressLine3}
						onChangeText={setAddressLine3}
						placeholder="Address Line 3"
						style={styles.input}
					/>
				</View>

				<DropdownSelector
					label="Country"
					value={country}
					onPress={() => setPickerType("country")}
				/>

				<DropdownSelector
					label="State"
					value={stateName}
					onPress={() => country && setPickerType("state")}
				/>

				<DropdownSelector
					label="City"
					value={city}
					onPress={() => stateName && setPickerType("city")}
				/>

				<View style={styles.fieldBlock}>
					<Text style={styles.label}>Pin Code</Text>
					<TextInput
						value={pinCode}
						onChangeText={setPinCode}
						placeholder="Enter Pin Code"
						keyboardType="number-pad"
						maxLength={10}
						style={styles.input}
					/>
				</View>

				<TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} activeOpacity={0.85}>
					<Text style={styles.saveButtonText}>Save Profile</Text>
				</TouchableOpacity>
			</ScrollView>

			<PickerModal
				visible={Boolean(pickerType)}
				title={pickerTitle}
				options={pickerOptions}
				onSelect={handleSelect}
				onClose={() => setPickerType("")}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#f4f7f4",
	},
	container: {
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 24,
	},
	pageTitle: {
		fontSize: 28,
		fontWeight: "700",
		color: "#1f3b2c",
		marginBottom: 18,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#24462f",
		marginTop: 8,
		marginBottom: 8,
	},
	fieldBlock: {
		marginBottom: 12,
	},
	label: {
		fontSize: 14,
		fontWeight: "600",
		color: "#3a4f3f",
		marginBottom: 6,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	input: {
		backgroundColor: "#ffffff",
		borderWidth: 1,
		borderColor: "#d1dcd1",
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 12,
		fontSize: 15,
		color: "#1f2b1f",
	},
	halfInput: {
		flex: 1,
	},
	halfInputSpacing: {
		marginRight: 10,
	},
	dropdown: {
		backgroundColor: "#ffffff",
		borderWidth: 1,
		borderColor: "#d1dcd1",
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 12,
	},
	dropdownText: {
		fontSize: 15,
		color: "#1f2b1f",
	},
	placeholderText: {
		color: "#869186",
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.35)",
		justifyContent: "flex-end",
	},
	modalCard: {
		backgroundColor: "#ffffff",
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 22,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		maxHeight: "55%",
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "700",
		color: "#1f3b2c",
		marginBottom: 10,
	},
	optionsContainer: {
		marginBottom: 12,
	},
	optionRow: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#eef2ee",
	},
	optionText: {
		fontSize: 16,
		color: "#263a2a",
	},
	closeButton: {
		alignSelf: "flex-end",
		backgroundColor: "#2e7d32",
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderRadius: 8,
	},
	closeButtonText: {
		color: "#ffffff",
		fontSize: 14,
		fontWeight: "600",
	},
	saveButton: {
		marginTop: 6,
		backgroundColor: "#2e7d32",
		paddingVertical: 13,
		borderRadius: 10,
		alignItems: "center",
	},
	saveButtonText: {
		color: "#ffffff",
		fontSize: 16,
		fontWeight: "700",
	},
});
