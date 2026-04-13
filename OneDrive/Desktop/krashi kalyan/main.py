from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import pandas as pd
import requests
import os
import datetime

app = FastAPI()

# Weather API Key provided by user
WEATHER_API_KEY = "492e33d1fad7ccaa27ba6d2abc458d07"

# Gemini API Key for chatbot
GEMINI_API_KEY = "AIzaSyBRMulYU3n9q3ZzRC43RgeShwUkyjk1E60"

# Load Datasets
try:
    df_yield = pd.read_csv("crop_yield.csv")
    df_soil = pd.read_csv("state_soil_data.csv")
    df_weather_hist = pd.read_csv("state_weather_data_1997_2020.csv")
    print("✅ Datasets loaded successfully")
    print(f"   Crop data: {len(df_yield)} records")
    print(f"   Soil data: {len(df_soil)} states")
    print(f"   Weather data: {len(df_weather_hist)} records")
except Exception as e:
    print(f"❌ Error loading datasets: {e}")

# Hindi season names mapping
SEASON_HINDI = {
    "Kharif": "खरीफ",
    "Rabi": "रबी",
    "Summer": "ज़ायद / गर्मी",
    "Whole Year": "पूरा वर्ष"
}

# Crop emoji mapping
CROP_EMOJIS = {
    "Rice": "🌾", "Wheat": "🌾", "Maize": "🌽", "Sugarcane": "🎋",
    "Cotton": "🧵", "Groundnut": "🥜", "Coconut": "🥥", "Banana": "🍌",
    "Jowar": "🌾", "Bajra": "🌾", "Pulses": "🫘", "Soyabean": "🫘",
    "Potato": "🥔", "Onion": "🧅", "Tomato": "🍅"
}

# Month-to-season mapping based on dataset values
def get_season_by_month(month: int):
    """Map current month to Indian agricultural seasons."""
    if month in [6, 7, 8, 9, 10]:
        return "Kharif"
    elif month in [11, 12, 1, 2]:
        return "Rabi"
    elif month in [3, 4, 5]:
        return "Summer"
    else:
        return "Whole Year"

# Month-wise recommended crop planting guide
MONTH_CROP_GUIDE = {
    1: {"season": "Rabi", "crops": ["गेहूँ / Wheat 🌾", "सरसों / Mustard 🌼", "चना / Gram 🫘", "मटर / Pea 🟢", "आलू / Potato 🥔"]},
    2: {"season": "Rabi", "crops": ["गेहूँ / Wheat 🌾", "सरसों / Mustard 🌼", "धनिया / Coriander 🌿", "प्याज / Onion 🧅"]},
    3: {"season": "Summer", "crops": ["मूंग / Moong 🫘", "खीरा / Cucumber 🥒", "तरबूज / Watermelon 🍉", "लौकी / Bottle Gourd 🥒"]},
    4: {"season": "Summer", "crops": ["मूंग / Moong 🫘", "उड़द / Urad 🫘", "भिंडी / Okra 🌿", "ककड़ी / Cucumber 🥒"]},
    5: {"season": "Summer", "crops": ["मक्का / Maize 🌽", "बाजरा / Bajra 🌾", "तिल / Sesame 🌿", "सूरजमुखी / Sunflower 🌻"]},
    6: {"season": "Kharif", "crops": ["धान / Rice 🌾", "मक्का / Maize 🌽", "कपास / Cotton 🧵", "सोयाबीन / Soybean 🫘", "अरहर / Arhar 🫘"]},
    7: {"season": "Kharif", "crops": ["धान / Rice 🌾", "बाजरा / Bajra 🌾", "ज्वार / Jowar 🌾", "मूंगफली / Groundnut 🥜"]},
    8: {"season": "Kharif", "crops": ["धान / Rice 🌾", "गन्ना / Sugarcane 🎋", "कपास / Cotton 🧵", "तुअर / Toor 🫘"]},
    9: {"season": "Kharif", "crops": ["गन्ना / Sugarcane 🎋", "बाजरा / Bajra 🌾", "उड़द / Urad 🫘"]},
    10: {"season": "Rabi Prep", "crops": ["गेहूँ / Wheat (बुवाई तैयारी) 🌾", "सरसों / Mustard (तैयारी) 🌼", "चना / Gram 🫘", "आलू / Potato 🥔"]},
    11: {"season": "Rabi", "crops": ["गेहूँ / Wheat 🌾", "सरसों / Mustard 🌼", "चना / Gram 🫘", "मटर / Pea 🟢", "आलू / Potato 🥔"]},
    12: {"season": "Rabi", "crops": ["गेहूँ / Wheat 🌾", "जौ / Barley 🌾", "सरसों / Mustard 🌼", "मसूर / Lentil 🫘"]}
}

@app.get("/api/states")
async def get_states():
    """Return list of all available states in the dataset."""
    states = sorted(df_yield['state'].str.strip().unique().tolist())
    return {"states": states}

@app.get("/api/weather/{city}")
async def get_weather(city: str):
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(url)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/data/{state}")
async def get_state_data(state: str, month: int = None):
    try:
        state_search = state.strip()
        if not month:
            month = datetime.datetime.now().month
        
        current_season = get_season_by_month(month)
        season_hindi = SEASON_HINDI.get(current_season, current_season)
        
        # Filter yield data by state
        state_df = df_yield[df_yield['state'].str.contains(state_search, case=False, na=False)]
        
        if state_df.empty:
            return {"error": f"No data found for state: {state_search}"}

        # Get seasonal crop recommendations from dataset
        seasonal_df = state_df[state_df['season'].str.contains(current_season, case=False, na=False)]
        if seasonal_df.empty:
            seasonal_df = state_df  # Fallback to all crops

        avg_yield = seasonal_df.groupby('crop')['yield'].mean().reset_index().sort_values(by='yield', ascending=False)
        top_crops = avg_yield.head(5).to_dict(orient='records')

        # Get soil data
        state_soil_df = df_soil[df_soil['state'].str.contains(state_search, case=False, na=False)]
        state_soil = state_soil_df.to_dict(orient='records')
        soil = state_soil[0] if state_soil else {"N": 60, "P": 40, "K": 30, "pH": 6.5}

        # Get historical weather data for this state (latest year)
        hist_weather = df_weather_hist[df_weather_hist['state'].str.contains(state_search, case=False, na=False)]
        latest_weather = hist_weather.sort_values('year', ascending=False).head(1).to_dict(orient='records')
        avg_humidity = latest_weather[0]['avg_humidity_percent'] if latest_weather else 60
        avg_temp = latest_weather[0]['avg_temp_c'] if latest_weather else 25

        # Disease risk calculation using weather data
        if avg_humidity > 75 and avg_temp > 25:
            disease_risk = "High"
            disease_msg = f"उच्च आर्द्रता ({avg_humidity:.0f}%) और तापमान ({avg_temp:.1f}°C) - कीट/रोग का खतरा अधिक!"
        elif avg_humidity > 60 or month in [6, 7, 8, 9]:
            disease_risk = "Medium"
            disease_msg = f"मध्यम आर्द्रता ({avg_humidity:.0f}%) - खेतों की निगरानी करें।"
        else:
            disease_risk = "Low"
            disease_msg = f"कम आर्द्रता ({avg_humidity:.0f}%) - रोग का खतरा कम है।"

        # Water sustainability based on rainfall
        total_rainfall = latest_weather[0]['total_rainfall_mm'] if latest_weather else 900
        water_score = min(95, max(30, int(total_rainfall / 30)))

        # Market price simulation based on yield quality
        top_yield = top_crops[0]['yield'] if top_crops else 1
        base_price = 2000 + int(top_yield * 8)
        base_cost = 1200 + int(top_yield * 3)
        margin = "Good" if (base_price - base_cost) > 900 else "Normal"

        # Storage capacity based on season
        storage_pct = 60 + (month * 2) if month <= 6 else 95 - ((month - 6) * 4)
        storage_pct = max(40, min(95, storage_pct))

        # Month-wise crop guide
        crop_guide = MONTH_CROP_GUIDE.get(month, {"season": current_season, "crops": []})

        return {
            "state": state_search,
            "season": current_season,
            "season_hindi": season_hindi,
            "month": month,
            "top_crops": top_crops,
            "soil": soil,
            "crop_guide": crop_guide,
            "sections": {
                "market": {
                    "price": f"₹{base_price}/qtl",
                    "cost": f"₹{base_cost}/qtl",
                    "margin": margin
                },
                "water": {
                    "usage": water_score,
                    "rainfall": f"{total_rainfall:.0f} mm"
                },
                "disease": {
                    "risk": disease_risk,
                    "msg": disease_msg
                },
                "storage": {
                    "capacity": storage_pct
                }
            },
            "weather_hist": {
                "avg_temp": avg_temp,
                "avg_humidity": avg_humidity,
                "total_rainfall": total_rainfall
            },
            "total_records": len(state_df)
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"error": str(e)}

@app.post("/api/chat")
async def chat_with_bot(request: Request):
    """Chat endpoint using Gemini API for agricultural help."""
    try:
        body = await request.json()
        user_message = body.get("message", "")
        
        if not user_message:
            return {"error": "Message is required"}

        system_prompt = """You are 'कृषि कल्याण सहायक' (Krishi Kalyan Sahayak), a friendly and knowledgeable agricultural assistant for Indian farmers.

Rules:
- Always respond in Hindi first, then English translation in brackets.
- Keep answers concise (2-4 sentences max).
- Focus on practical, actionable farming advice.
- Cover topics: crop diseases, soil health, irrigation, market prices, government schemes (PM Kisan, crop insurance), weather impact, organic farming.
- If asked non-farming questions, politely redirect to agriculture.
- Use emojis to make responses friendly 🌾🌿💧
- Always end with an encouraging message for the farmer."""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\nFarmer's question: {user_message}"}]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 500
            }
        }
        
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=15)
        result = response.json()
        
        if response.status_code == 429:
            return {"reply": "अभी सर्वर पर बहुत अनुरोध आ रहे हैं। कृपया 1 मिनट बाद पुनः प्रयास करें। 🙏\n(Too many requests. Please try again after 1 minute.)"}
        
        if "candidates" in result and len(result["candidates"]) > 0:
            reply = result["candidates"][0]["content"]["parts"][0]["text"]
            return {"reply": reply}
        else:
            error_msg = result.get("error", {}).get("message", "Unknown error")
            print(f"Gemini API error: {error_msg}")
            return {"reply": "माफ़ करें, अभी सेवा उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें। 🙏\n(Sorry, service is currently unavailable. Please try again later.)"}
            
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"reply": "माफ़ करें, कोई त्रुटि हुई। कृपया पुनः प्रयास करें। 🙏\n(Sorry, an error occurred. Please try again.)"}

@app.post("/api/analyze-image")
async def analyze_image(request: Request):
    """Analyze crop images using Gemini Vision API."""
    try:
        body = await request.json()
        image_b64 = body.get("image", "")
        
        if not image_b64:
            return {"error": "Image data is required"}
            
        # Strip data URL prefix if present
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]

        prompt = """You are an expert agricultural scientist. Analyze the provided image of a crop, leaf, or soil.
        1. Identify the crop and the exact disease, pest, or nutrient deficiency.
        2. Explain the likely cause.
        3. Recommend immediate organic and chemical treatments.
        Provide your exact answer in Hindi first, followed by an English summary in brackets. Keep it concise (3-5 sentences)."""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 800
            }
        }
        
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=20)
        result = response.json()
        
        if response.status_code == 429:
            return {"analysis": "अभी सर्वर पर बहुत अनुरोध आ रहे हैं। कृपया 1 मिनट बाद पुनः प्रयास करें।\n(Too many requests. Please try again after 1 minute.)"}
            
        if "candidates" in result and len(result["candidates"]) > 0:
            analysis = result["candidates"][0]["content"]["parts"][0]["text"]
            return {"analysis": analysis}
        else:
            return {"analysis": "बीमारी की पहचान नहीं हो पाई। कृपया अधिक स्पष्ट फोटो अपलोड करें।\n(Could not identify the problem. Please upload a clearer photo.)"}
            
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"analysis": "चित्र के विश्लेषण में त्रुटि हुई। कृपया पुनः प्रयास करें।\n(Error analyzing image. Please try again.)"}

# Serve static files
app.mount("/", StaticFiles(directory="./", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
