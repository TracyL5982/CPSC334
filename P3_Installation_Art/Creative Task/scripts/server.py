import asyncio
import websockets
import socket

hostname = socket.gethostname()
ip_address = socket.gethostbyname_ex(hostname)[-1][-1]
print(f"IP Address: {ip_address}")

async def handle_client(websocket, path):
    print("Client connected to WebSocket")
    buffer = ""
    while True:
        try:
            content = await asyncio.to_thread(tcp_connection.recv, 128)
            content = content.decode("utf-8")
            buffer += content

            while "\n" in buffer:
                message, buffer = buffer.split("\n", 1)
                message = message.strip()
                if message:
                    await websocket.send(message)
                    print(f"Sent data to WebSocket client: {message}")

        except Exception as e:
            print(f"Error: {e}")
            break
    print("Client disconnected")

tcp_client = socket.socket()
tcp_client.bind(('0.0.0.0', 10000))
tcp_client.listen(1)
print("TCP server waiting for ESP32 connection...")
tcp_connection, addr = tcp_client.accept()
print(f"ESP32 connected from {addr}")

start_server = websockets.serve(handle_client, "localhost", 8765)
asyncio.get_event_loop().run_until_complete(start_server)
print("WebSocket server running on ws://localhost:8765")
asyncio.get_event_loop().run_forever()
