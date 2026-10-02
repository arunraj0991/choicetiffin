import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "@/src/store/auth";

let isLoggingOut = false;

//const API_BASE_URL = 'http://10.0.2.2/tiffin_new/public/api/';
const API_BASE_URL = "https://choicetiffinservices.com/api/";
const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "/");

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export const resolveImageUrl = (path?: string | null, folder?: string) => {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  const origin = MEDIA_BASE_URL.replace(/\/$/, "");
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
  if (trimmed.startsWith("upload/")) return `${origin}/${trimmed}`;
  if (folder) return `${origin}/upload/${folder}/${trimmed}`;
  return `${origin}/upload/${trimmed}`;
};

const resolveMediaUrl = (path?: string | null, folder = "meal") =>
  resolveImageUrl(path, folder);

const normalizeMeal = (meal: any) => {
  if (!meal || typeof meal !== "object") return meal;
  return {
    ...meal,
    img: resolveMediaUrl(meal?.img, "meal"),
    duration: meal?.duration ?? meal?.duration_days ?? meal?.durationdays,
    mrp: meal?.mrp ?? meal?.original_price ?? meal?.old_price ?? null,
  };
};

const normalizeHomepageMeals = (sections: any[] = []) =>
  (Array.isArray(sections) ? sections : []).map((section) => ({
    ...section,
    image: resolveImageUrl(section?.image, "homepage_menu") ?? section?.image,
    meals: (Array.isArray(section?.meals) ? section.meals : []).map(
      (meal: any) => normalizeMeal(meal),
    ),
    categories: (Array.isArray(section?.categories)
      ? section.categories
      : []
    ).map((category: any) => ({
      ...category,
      img:
        resolveImageUrl(category?.img ?? category?.image, "category") ??
        category?.img ??
        category?.image,
    })),
  }));

apiClient.interceptors.request.use((request) => {

  const method = request.method?.toUpperCase() || "GET";
  const baseURL = request.baseURL || "";
  const url = request.url || "";
  let fullUrl = `${baseURL}${url}`;

  if (method === "GET") {
    request.params = { ...request.params, _t: Date.now() };
  }

  if (request.params) {
    const query = Object.keys(request.params)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(request.params[key])}`,
      )
      .join("&");
    if (query) fullUrl += `?${query}`;
  }

  let curl = `curl --location --request ${method} '${fullUrl}'`;

  if (request.headers) {
    Object.keys(request.headers).forEach((key) => {
      // Ignore Axios internal header config objects
      if (
        !["common", "delete", "get", "head", "post", "put", "patch"].includes(
          key.toLowerCase(),
        )
      ) {
        curl += ` \\\n--header '${key}: ${request.headers[key]}'`;
      }
    });
  }

  if (request.data) {
    curl += ` \\\n--data-raw '${JSON.stringify(request.data)}'`;
  }

  console.log("--- cURL COMMAND ---");
  console.log(curl);
  console.log("--------------------");

  return request;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log("<<< API RESPONSE <<<");
    console.log(
      `${response.config.method?.toUpperCase()} ${response.config.baseURL || ""}${response.config.url || ""}`,
    );
    console.log("Response Data:", JSON.stringify(response.data, null, 2));
    return response;
  },
  async (error) => {
    console.log("<<< API ERROR <<<");
    if (error.config) {
      console.log(
        `${error.config.method?.toUpperCase()} ${error.config.baseURL || ""}${error.config.url || ""}`,
      );
    }
    console.log("Error Message:", error.message);
    if (error.response) {
      console.log(
        "Error Response Data:",
        JSON.stringify(error.response.data, null, 2),
      );
    }

    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      await AsyncStorage.multiRemove(["user_token", "user_id"]);
      Alert.alert(
        "Session Expired",
        "You have to relogin, session expired.",
        [
          {
            text: "OK",
            onPress: () => {
              isLoggingOut = false;
              useAuthStore.getState().clearUser();
              router.replace("/login" as any);
            },
          },
        ],
        { cancelable: false },
      );
    }
    return Promise.reject(error);
  },
);

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("user_token");
  return { Authorization: `Bearer ${token}` };
};

export const welcome = async () => {
  const response = await apiClient.get("welcome");
  return response.data;
};

export const homepage = async (lat: number, lng: number, user_id: string) => {
  console.log("homepage API =--->", lat, lng, user_id);
  const response = await apiClient.get("homepage", {
    params: { lat, lng, user_id },
  });
  return response.data;
};

export const getHomepageMeals = async (userId?: string) => {
  const user_id = userId ?? (await AsyncStorage.getItem("user_id")) ?? "";
  const response = await apiClient.get("getHomepageMeals", {
    params: { user_id },
  });
  return {
    ...response?.data,
    data: normalizeHomepageMeals(response?.data?.data),
  };
};

export const getHomePageMenuSeeAll = async (
  id: string | number,
  userId?: string,
) => {
  const user_id = userId ?? (await AsyncStorage.getItem("user_id")) ?? "";
  const response = await apiClient.get("homePageMenuSeeAll", {
    params: { id, user_id },
  });
  const payload = response?.data?.data;
  const normalizeCategory = (category: any) => ({
    ...category,
    img:
      resolveImageUrl(category?.img ?? category?.image, "category") ??
      category?.img ??
      category?.image,
    meals: (Array.isArray(category?.meals) ? category.meals : []).map(
      (meal: any) => normalizeMeal(meal),
    ),
  });

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const meals = Array.isArray(payload.meals) ? payload.meals : [];
    const categories = Array.isArray(payload.categories)
      ? payload.categories
      : [];
    return {
      ...response?.data,
      data: meals.map((meal: any) => normalizeMeal(meal)),
      categories: categories.map(normalizeCategory),
    };
  }

  const items = Array.isArray(payload) ? payload : [];
  return {
    ...response?.data,
    data: items.map((meal: any) => normalizeMeal(meal)),
    categories: items.map(normalizeCategory),
  };
};

export const getCategoryMeals = async (
  categoryId: string | number,
  userId?: string,
) => {
  const user_id = userId ?? (await AsyncStorage.getItem("user_id")) ?? "";
  const response = await apiClient.get("getMealsByCategory", {
    params: { category_id: categoryId, user_id },
  });
  return response.data?.meals;
};

export const getAllCategories = async (categoryId: string | number) => {
  const response = await apiClient.get("categoryMeals", {
    params: { category_id: categoryId },
  });

  const payload = response?.data?.data;
  const normalizeCategory = (category: any) => ({
    ...category,
    img:
      resolveImageUrl(category?.img ?? category?.image, "category") ??
      category?.img ??
      category?.image,
    meals: (Array.isArray(category?.meals) ? category.meals : []).map(
      (meal: any) => normalizeMeal(meal),
    ),
  });

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return {
      ...response?.data,
      data: {
        ...payload,
        img:
          resolveImageUrl(payload?.img ?? payload?.image, "category") ??
          payload?.img ??
          payload?.image,
        categories: (Array.isArray(payload?.categories)
          ? payload.categories
          : []
        ).map(normalizeCategory),
      },
    };
  }

  return {
    ...response?.data,
    data: {
      categories: (Array.isArray(payload) ? payload : []).map(normalizeCategory),
    },
  };
};

export const search = async (searchTerm: string) => {
  const response = await apiClient.get("search", {
    params: { search: searchTerm },
  });
  const meals = Array.isArray(response?.data?.data?.meals)
    ? response.data.data.meals
    : [];
  return {
    ...response?.data,
    data: {
      ...(response?.data?.data ?? {}),
      meals: meals.map((meal: any) => normalizeMeal(meal)),
    },
  };
};

export const category = async (
  categoryId: string,
  lat: number,
  lng: number,
) => {
  const response = await apiClient.get("category", {
    params: { category_id: categoryId, lat, lng },
  });
  return response.data;
};

export const getStore = async (storeId: string) => {
  const response = await apiClient.get("getStore", {
    params: { store_id: storeId },
  });
  return response.data;
};

export const getMeal = async (storeId: string, cartNo?: string) => {
  const params: any = { store_id: storeId };
  if (cartNo) params.cart_no = cartNo;
  const response = await apiClient.get("getMeal", { params });
  const data = response.data;
  if (Array.isArray(data?.meals)) {
    data.meals = data.meals.map((meal: any) => {
      const normalized = normalizeMeal(meal);
      return {
        ...normalized,
        title: meal?.title ?? meal?.name ?? normalized?.name,
        image: meal?.image ?? normalized?.img,
      };
    });
  }
  return data;
};

export const addToCart = async (
  storeId: string,
  itemId: string,
  qty: number,
  cartNo: string,
  meal_type: string,
) => {
  const payload = {
    store_id: storeId,
    item_id: itemId,
    qty,
    cart_no: cartNo,
    meal_type,
  };

  console.log("payload API =--->", payload);
  const response = await apiClient.post("addToCart", payload);
  console.log("response =--->", response);
  return response.data;
};

export const getCart = async (cartNo: string) => {
  const response = await apiClient.get("getCart", {
    params: { cart_no: cartNo },
  });
  return response.data;
};

export const getAddons = async (type?: string) => {
  const foodType = String(type ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  const response = await apiClient.get("getAddons", {
    params:
      foodType && foodType !== "all"
        ? { type: foodType === "nonvegetarian" ? "nonveg" : foodType }
        : undefined,
  });
  const addons = Array.isArray(response?.data?.data) ? response.data.data : [];
  return {
    ...response?.data,
    data: addons.map((addon: any) => ({
      ...addon,
      img: resolveMediaUrl(addon?.img, "addon"),
    })),
  };
};

export const getMenus = async () => {
  const response = await apiClient.get("getMenus");
  return {
    ...response?.data,
    data: Array.isArray(response?.data?.data) ? response.data.data : [],
  };
};

export const deleteCart = async (cartId: string, userId: string) => {
  const response = await apiClient.get("deleteCart", {
    params: { cart_id: cartId, user_id: userId },
  });
  return response.data;
};

export const signup = async (userData: object) => {
  const response = await apiClient.post("signup", userData);
  return response.data;
};

export const savePendingUser = async (payload: {
  name: string;
  number: string;
  food_type: string;
}) => {
  const response = await apiClient.post("save-pending-user", payload);
  return response.data;
};

export const verifyOtp = async (
  userId: string,
  otp1: string,
  otp2: string,
  otp3: string,
  otp4: string,
) => {
  const response = await apiClient.post(
    "verify",
    { otp_1: otp1, otp_2: otp2, otp_3: otp3, otp_4: otp4 },
    { params: { id: userId } },
  );
  return response.data;
};

export const resendCode = async (userId: string) => {
  const response = await apiClient.get("resendCode", {
    params: { id: userId },
  });
  return response.data;
};

export const login = async (email: string, password: string) => {
  const response = await apiClient.post("login", { email, password });
  return response.data;
};

export const forgotPassword = async (email: string) => {
  const response = await apiClient.post("forgot", { email });
  return response.data;
};

export const getOffers = async (userId: string) => {
  const response = await apiClient.get("getOffers", {
    params: { user_id: userId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const applyCouponAPI = async (
  code: string,
  cartNo: string,
  userId: string,
) => {
  const response = await apiClient.get("applyCoupon", {
    params: { code, cart_no: cartNo, user_id: userId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const addAddress = async (
  userId: string,
  address: string,
  houseNo: string,
  landmark: string,
  type: string,
  lat: number,
  lng: number,
) => {
  const response = await apiClient.post(
    "addAddress",
    {
      user_id: userId,
      address,
      house_no: houseNo,
      landmark,
      type,
      lat,
      lng,
    },
    { headers: await getAuthHeaders() },
  );
  return response.data;
};

export const removeAddress = async (addressId: string) => {
  const response = await apiClient.get("removeAddress", {
    params: { id: addressId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const changeAddress = async (
  userId: string,
  orderId: string,
  addressId: string,
) => {
  const response = await apiClient.get("changeAddress", {
    params: { user_id: userId, order_id: orderId, address_id: addressId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};
export const modifyAddress = async (
  orderId: string,
  addressId: string,
) => {
  console.log("modifyAddress =--->", orderId, addressId);
  const response = await apiClient.post(
    "modify-address",
    {
      order_id: orderId,
      address_id: Number(addressId),
    },
    { headers: await getAuthHeaders() },
  );
  return response.data;
};

export const getSubscriptionGuidelines = async () => {
  const response = await apiClient.get("getSubscriptionGuidelines");
  return response.data;
};

export const getSubscription = async (userId: string) => {
  const response = await apiClient.get("subscription", {
    params: { user_id: userId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const getSettings = async () => {
  const response = await apiClient.get("get-settings");
  return response.data;
};

export const getAccount = async (userId: string) => {
  const response = await apiClient.get("account", {
    params: { user_id: userId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const subscriptionPause = async (userId: string, orderId: string) => {
  const response = await apiClient.get("subscriptionPause", {
    params: { user_id: userId, order_id: orderId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const subscriptionResume = async (userId: string, orderId: string) => {
  const response = await apiClient.get("subscriptionResume", {
    params: { user_id: userId, order_id: orderId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const subscriptionCancel = async (userId: string, orderId: string) => {
  const response = await apiClient.get("subscriptionCancel", {
    params: { user_id: userId, order_id: orderId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const rateUs = async (
  mealId: number,
  stars: number,
  reviewText: string,
  storeId: string | number,
) => {
  const response = await apiClient.post(
    "rateUs",
    {
      meal_id: mealId,
      store_id: storeId,
      stars,
      review_text: reviewText,
    },
    { headers: await getAuthHeaders() },
  );
  return response.data;
};

export const rateRider = async (payload: {
  rider_id: string | number;
  delivery_id: string | number;
  stars: number;
  review_text: string;
}) => {
  const response = await apiClient.post("rate-rider", payload, {
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const getMealReviews = async (mealId: string | number) => {
  const response = await apiClient.get("getMealReviews", {
    params: { meal_id: mealId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const modifyMeal = async (itemId: string) => {
  const response = await apiClient.post(
    "modifyMeal",
    { item_id: itemId },
    { headers: await getAuthHeaders() },
  );
  const payload = response?.data;
  const raw = payload?.data ?? payload;
  const meal = Array.isArray(raw) ? raw[0] : raw?.meal ?? raw;

  if (!meal || typeof meal !== "object") {
    return { ...payload, data: null };
  }

  return {
    ...payload,
    data: normalizeMeal(meal),
  };
};

export const saveModifyMeal = async (payload: {
  order_id: string;
  meal_name: string;
  qty: number;
  addon: { name: string; qty: number }[];
  modify_date: string[];
  slot: string[];
  address_id?: string;
}) => {
  const response = await apiClient.post("saveModifyMeal", payload, {
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const modifySubscriptionDates = async (orderId: string) => {
  const response = await apiClient.get("modifySubscriptionDates", {
    params: { order_id: orderId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const placeOrder = async (orderData: object) => {
  const response = await apiClient.post("placeOrder", orderData, {
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const getDelivery = async (orderId: string) => {
  if (orderId === "DUMMY") {
    return {
      data: {
        items: [
          {
            name: "Chawal Sabzi Meal",
            start_date: "2026-08-10",
            end_date: "2026-08-15",
            meal_type: "Lunch",
          },
        ],
        delivery: [
          {
            name: "Chawal Sabzi Meal",
            delivery: [
              {
                id: 1,
                order_id: "DUMMY",
                delivery_date: "2026-08-10",
                delivery_status: "delivered",
                status_date: "2026-08-10",
              },
              {
                id: 2,
                order_id: "DUMMY",
                delivery_date: "2026-08-11",
                delivery_status: "scheduled",
                d_time: "Lunch",
              },
              {
                id: 3,
                order_id: "DUMMY",
                delivery_date: "2026-08-12",
                delivery_status: "scheduled",
                d_time: "Lunch",
              },
              {
                id: 4,
                order_id: "DUMMY",
                delivery_date: "2026-08-13",
                delivery_status: "scheduled",
                d_time: "Dinner",
              },
            ],
          },
        ],
      },
    };
  }
  const response = await apiClient.get("getDelivery", {
    params: { order_id: orderId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const skipDelivery = async (orderId: string, deliveryId: string) => {
  const response = await apiClient.get("skipDelivery", {
    params: { order_id: orderId, delivery_id: deliveryId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const donateDelivery = async (deliveryId: string) => {
  const response = await apiClient.post(
    "markDonate",
    { delivery_id: String(deliveryId) },
    { headers: await getAuthHeaders() },
  );
  return response.data;
};

export const saveDeliveryInstruction = async (
  deliveryId: string | number,
  content: string,
  type: "kitchen" | "delivery" = "delivery",
) => {
  const response = await apiClient.post(
    "save_delivery_instruction",
    {
      delivery_id: String(deliveryId),
      type,
      content,
    },
    { headers: await getAuthHeaders() },
  );
  return response.data;
};

export const getUser = async (userId: string) => {
  const response = await apiClient.get("getUser", {
    params: { user_id: userId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const updateUser = async (userData: object) => {
  const response = await apiClient.post("updateUser", userData, {
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const updatePassword = async (userId: string, password: string) => {
  const response = await apiClient.post(
    "updatePassword",
    { user_id: userId, password },
    { headers: await getAuthHeaders() },
  );
  return response.data;
};

export const contact = async (contactData: object) => {
  const response = await apiClient.post("contact", contactData, {
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const deleteAccount = async (userId: string, password: string) => {
  const response = await apiClient.post(
    "deleteAccount",
    { user_id: userId, password },
    { headers: await getAuthHeaders() },
  );
  return response.data;
};

export const logout = async (userId: string) => {
  const response = await apiClient.get("logout", {
    params: { user_id: userId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const createPaymentIntent = async (amount: number) => {
  const response = await apiClient.post(
    "createPaymentIntent",
    { amount },
    { headers: await getAuthHeaders() },
  );
  return response.data.clientSecret;
};

export const createRazorpayOrder = async (amount: number) => {
  const response = await apiClient.post(
    "razorpay",
    { amount },
    { headers: await getAuthHeaders() },
  );
  return response.data;
};

export const getApiKeys = async () => {
  const response = await apiClient.get("getApiKeys");
  return response;
};

export const getPush = async () => {
  const response = await apiClient.get("getPush");
  return response;
};

export const getComplaints = async (page = 1) => {
  const response = await apiClient.get("get_complaints", {
    params: { page },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const getPaymentHistory = async (userId: string) => {
  const response = await apiClient.get("get-payment-history", {
    params: { user_id: userId },
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const saveComplaint = async (payload: {
  subject: string;
  complaint: string;
  user_type: string;
  image?: string;
}) => {
  const response = await apiClient.post("save_complaint", payload, {
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const editComplaint = async (payload: {
  complaint_id: number | string;
  subject: string;
  complaint: string;
  image?: string;
}) => {
  const response = await apiClient.post("edit_complaint", payload, {
    headers: await getAuthHeaders(),
  });
  return response.data;
};

export const renewSubscriptionOrder = async (
  orderId: string,
  startDate: string,
) => {
  const response = await apiClient.post(
    "renew_subscription",
    { order_id: orderId, start_date: startDate },
    { headers: await getAuthHeaders() },
  );
  return response.data;
};
