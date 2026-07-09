package com.lajesfit.android.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.lajesfit.android.ui.components.PlaceholderScreen
import com.lajesfit.android.ui.theme.LajesFitTheme

@Composable
fun ProfileScreen(
    username: String,
    onOpenSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.Person,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.size(36.dp),
            )
        }
        Text(
            text = "@$username",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(top = 12.dp),
        )
        Text(
            text = "Em construcao",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp, bottom = 16.dp),
        )
        OutlinedButton(onClick = onOpenSettings) {
            Icon(
                imageVector = Icons.Filled.Settings,
                contentDescription = null,
                modifier = Modifier.padding(end = 8.dp).size(18.dp),
            )
            Text("Configuracoes")
        }
    }
}

@Composable
fun SearchProfilesScreen(
    onOpenProfile: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    PlaceholderScreen(title = "Busca", modifier = modifier)
}

@Preview(showBackground = true)
@Composable
private fun ProfileScreenPreview() {
    LajesFitTheme {
        ProfileScreen(username = "magno", onOpenSettings = {})
    }
}

@Preview(showBackground = true)
@Composable
private fun SearchProfilesScreenPreview() {
    LajesFitTheme {
        SearchProfilesScreen(onOpenProfile = {})
    }
}
