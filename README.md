# 🤖 Mi primer Agente IA

Agente que convierte lenguaje natural en consultas **MySQL** (MariaDB) usando inteligencia artificial.  
Construido con 🧠 [Ollama](https://ollama.com/) y ⚙️ Node.js.

## 📦 Requisitos

### 1️⃣ Instalar [Ollama](https://ollama.com/)
Ollama permite correr modelos de lenguaje localmente.

### 2️⃣ Descargar el modelo `gemma3`
Abre una ventana de comandos y ejecuta:
ollama run gemma3:12b

### 3️⃣ Instalar Node.js LTS
Asegúrate de instalar la versión LTS (Long Term Support) de Node.js.

### 4️⃣ Instalar dependencias
Ejecutar el comando en una ventana de comandos, en la raíz del proyecto:
npm i 

## ⚙️ Configuración para la conexión a la base de datos:
Se debe modificar los datos de conexión creando un archivo .env con los datos de conexión correspondientes:

DB_HOST=localhost
DB_USER=usuario_db
DB_PASSWORD=password_db
DB_NAME=nombre_db

## ▶️ Ejecución
Ejecuta todos los scripts .bat en el orden especificado en sus nombres.

## 👨‍💻 Autor
Martin Medina Ruvian [martindjmedina.com](https://martindjmedina.com/)
