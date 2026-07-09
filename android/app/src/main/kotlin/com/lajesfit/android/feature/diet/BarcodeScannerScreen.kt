package com.lajesfit.android.feature.diet

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview as CameraXPreview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.common.InputImage
import com.lajesfit.android.ui.theme.LajesFitTheme
import java.util.concurrent.Executors

@Composable
fun BarcodeScannerScreen(
    onDone: () -> Unit,
    onFoodFound: (String) -> Unit,
    viewModel: BarcodeScannerViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    LaunchedEffect(uiState.resultJson) {
        uiState.resultJson?.let(onFoodFound)
    }
    BarcodeScannerContent(
        uiState = uiState,
        onDone = onDone,
        onBarcodeDetected = viewModel::lookupDetectedBarcode,
        onManualBarcodeChange = viewModel::onManualBarcodeChange,
        onLookupManualBarcode = viewModel::lookupManualBarcode,
    )
}

@Composable
@OptIn(ExperimentalMaterial3Api::class)
private fun BarcodeScannerContent(
    uiState: BarcodeScannerUiState,
    onDone: () -> Unit,
    onBarcodeDetected: (String) -> Unit,
    onManualBarcodeChange: (String) -> Unit,
    onLookupManualBarcode: () -> Unit,
) {
    val context = LocalContext.current
    var hasPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasPermission = granted
    }

    LaunchedEffect(Unit) {
        if (!hasPermission) permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Codigo de barras") },
                navigationIcon = {
                    IconButton(onClick = onDone) {
                        Icon(Icons.Filled.Close, contentDescription = "Fechar")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (hasPermission) {
                CameraPreview(onBarcodeDetected = onBarcodeDetected, modifier = Modifier.fillMaxWidth().height(360.dp))
            } else {
                Text(
                    "Permita o acesso a camera para escanear o codigo de barras.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) }) {
                    Text("Permitir camera")
                }
            }
            if (uiState.isLookingUp) CircularProgressIndicator()
            uiState.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            OutlinedTextField(
                value = uiState.manualBarcode,
                onValueChange = onManualBarcodeChange,
                label = { Text("Codigo manual") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii),
                modifier = Modifier.fillMaxWidth(),
            )
            Button(onClick = onLookupManualBarcode, enabled = !uiState.isLookingUp, modifier = Modifier.fillMaxWidth()) {
                Text("Buscar codigo")
            }
        }
    }
}

@androidx.annotation.OptIn(ExperimentalGetImage::class)
@Composable
private fun CameraPreview(onBarcodeDetected: (String) -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val executor = remember { Executors.newSingleThreadExecutor() }
    val scanner = remember {
        BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(
                    Barcode.FORMAT_EAN_13,
                    Barcode.FORMAT_EAN_8,
                    Barcode.FORMAT_UPC_A,
                    Barcode.FORMAT_UPC_E,
                    Barcode.FORMAT_CODE_128,
                )
                .build(),
        )
    }

    DisposableEffect(Unit) {
        onDispose {
            scanner.close()
            executor.shutdown()
        }
    }

    AndroidView(
        modifier = modifier,
        factory = { viewContext ->
            val previewView = PreviewView(viewContext)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(viewContext)
            cameraProviderFuture.addListener(
                {
                    val cameraProvider = cameraProviderFuture.get()
                    val preview = CameraXPreview.Builder().build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }
                    val analysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                    analysis.setAnalyzer(executor) { imageProxy ->
                        val mediaImage = imageProxy.image
                        if (mediaImage == null) {
                            imageProxy.close()
                            return@setAnalyzer
                        }
                        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
                        scanner.process(image)
                            .addOnSuccessListener { barcodes ->
                                barcodes.firstOrNull()?.rawValue?.let(onBarcodeDetected)
                            }
                            .addOnCompleteListener { imageProxy.close() }
                    }
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
                },
                ContextCompat.getMainExecutor(context),
            )
            previewView
        },
    )
}

@Preview(showBackground = true)
@Composable
private fun BarcodeScannerScreenPreview() {
    LajesFitTheme {
        BarcodeScannerContent(
            uiState = BarcodeScannerUiState(errorMessage = "Produto nao encontrado. Digite o codigo manualmente."),
            onDone = {},
            onBarcodeDetected = {},
            onManualBarcodeChange = {},
            onLookupManualBarcode = {},
        )
    }
}
