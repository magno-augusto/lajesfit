package com.lajesfit.android.feature.workouts

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.lajesfit.android.ui.theme.LajesFitTheme

class HealthPermissionRationaleActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            LajesFitTheme {
                HealthPermissionRationaleContent(onClose = ::finish)
            }
        }
    }
}

@Composable
private fun HealthPermissionRationaleContent(onClose: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Health Connect", style = MaterialTheme.typography.headlineSmall)
        Text(
            "O LajesFit usa o Health Connect apenas para ler sessoes de exercicio autorizadas por voce. " +
                "Esses dados ajudam a preencher seus treinos, calorias queimadas e rankings do desafio.",
        )
        Text(
            "A leitura so acontece depois da sua permissao. Voce pode revogar o acesso a qualquer momento nas configuracoes do Health Connect.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Button(onClick = onClose) {
            Text("Entendi")
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun HealthPermissionRationalePreview() {
    LajesFitTheme {
        HealthPermissionRationaleContent(onClose = {})
    }
}
